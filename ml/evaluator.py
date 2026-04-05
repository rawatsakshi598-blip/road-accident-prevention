"""
Evaluation engine.

Computes metrics for every trained model and saves comparison JSON + plots.
"""

import json
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    cohen_kappa_score,
    confusion_matrix,
    log_loss,
    matthews_corrcoef,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.preprocessing import label_binarize
from tabulate import tabulate

from config import MODEL_COMPARISON_PATH, MODEL_NAMES, PLOTS_DIR

warnings.filterwarnings("ignore")

plt.rcParams.update({
    "figure.facecolor": "#1B1B2F",
    "axes.facecolor": "#1F2940",
    "axes.edgecolor": "#2D3748",
    "axes.labelcolor": "#FFFFFF",
    "xtick.color": "#8899A6",
    "ytick.color": "#8899A6",
    "text.color": "#FFFFFF",
    "grid.color": "#2D3748",
    "grid.linewidth": 0.5,
    "font.family": "DejaVu Sans",
    "font.size": 10,
})

SEVERITY_PALETTE = ["#EF4444", "#F97316", "#F59E0B", "#10B981"]
CHART_COLORS = ["#2563EB", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#F97316", "#06B6D4"]


# ── Metric computation ─────────────────────────────────────────────────────────

def _compute_metrics(
    model_id: str,
    estimator,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_labels: List[str],
    cv_mean: float,
    cv_std: float,
    training_time: float,
) -> Dict:
    y_pred = estimator.predict(X_test)

    try:
        y_prob = estimator.predict_proba(X_test)
    except AttributeError:
        y_prob = None

    n_classes = len(np.unique(y_test))

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1w = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    f1m = f1_score(y_test, y_pred, average="macro", zero_division=0)
    kappa = cohen_kappa_score(y_test, y_pred)
    mcc = matthews_corrcoef(y_test, y_pred)

    if y_prob is not None:
        try:
            if n_classes == 2:
                auc = roc_auc_score(y_test, y_prob[:, 1])
            else:
                auc = roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")
        except Exception:
            auc = float("nan")
        try:
            ll = log_loss(y_test, y_prob)
        except Exception:
            ll = float("nan")
    else:
        auc = ll = float("nan")

    return {
        "id": model_id,
        "name": MODEL_NAMES.get(model_id, model_id),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_weighted": round(f1w, 4),
        "f1_macro": round(f1m, 4),
        "cohens_kappa": round(kappa, 4),
        "mcc": round(mcc, 4),
        "roc_auc": round(auc, 4) if not np.isnan(auc) else None,
        "log_loss": round(ll, 4) if not np.isnan(ll) else None,
        "cv_mean": round(cv_mean, 4),
        "cv_std": round(cv_std, 4),
        "training_time_seconds": round(training_time, 2),
    }


# ── Confusion matrix ──────────────────────────────────────────────────────────

def _save_confusion_matrix(
    model_id: str,
    y_test: np.ndarray,
    y_pred: np.ndarray,
    class_labels: List[str],
) -> Tuple[List[List[int]], List[List[float]]]:
    cm = confusion_matrix(y_test, y_pred)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)

    for normalized, suffix in [(False, "raw"), (True, "norm")]:
        data = cm_norm if normalized else cm
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(
            data,
            annot=True,
            fmt=".2f" if normalized else "d",
            cmap="Blues",
            xticklabels=class_labels,
            yticklabels=class_labels,
            ax=ax,
            linewidths=0.5,
            linecolor="#2D3748",
        )
        ax.set_title(
            f"{MODEL_NAMES.get(model_id, model_id)} — Confusion Matrix "
            f"({'Normalised' if normalized else 'Raw'})",
            pad=12,
        )
        ax.set_ylabel("True Label")
        ax.set_xlabel("Predicted Label")
        plt.tight_layout()
        path = PLOTS_DIR / f"cm_{model_id}_{suffix}.png"
        fig.savefig(path, dpi=100, bbox_inches="tight")
        plt.close(fig)

    return cm.tolist(), cm_norm.round(4).tolist()


# ── ROC curves ────────────────────────────────────────────────────────────────

def _compute_roc_data(
    estimator,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_labels: List[str],
) -> Dict:
    try:
        y_prob = estimator.predict_proba(X_test)
    except AttributeError:
        return {}

    classes = np.unique(y_test)
    y_bin = label_binarize(y_test, classes=classes)
    roc_data = {}

    for i, cls in enumerate(classes):
        label = class_labels[i] if i < len(class_labels) else str(cls)
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_prob[:, i])
        try:
            auc = roc_auc_score(y_bin[:, i], y_prob[:, i])
        except Exception:
            auc = 0.0
        roc_data[label] = {
            "fpr": [round(float(v), 4) for v in fpr],
            "tpr": [round(float(v), 4) for v in tpr],
            "auc": round(float(auc), 4),
        }

    return roc_data


# ── Feature importance ────────────────────────────────────────────────────────

def _save_feature_importance(
    model_id: str,
    estimator,
    feature_names: List[str],
    top_n: int = 20,
):
    importances = None
    if hasattr(estimator, "feature_importances_"):
        importances = estimator.feature_importances_
    elif hasattr(estimator, "coef_"):
        importances = np.abs(estimator.coef_).mean(axis=0)

    if importances is None:
        return

    idx = np.argsort(importances)[-top_n:][::-1]
    names = [feature_names[i] for i in idx]
    vals = importances[idx]

    fig, ax = plt.subplots(figsize=(10, 6))
    colors = plt.cm.Blues(np.linspace(0.4, 0.9, len(names)))
    ax.barh(range(len(names)), vals[::-1], color=colors[::-1])
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names[::-1], fontsize=9)
    ax.set_xlabel("Importance")
    ax.set_title(f"{MODEL_NAMES.get(model_id, model_id)} — Top {top_n} Feature Importances")
    plt.tight_layout()
    path = PLOTS_DIR / f"feature_importance_{model_id}.png"
    fig.savefig(path, dpi=100, bbox_inches="tight")
    plt.close(fig)


# ── Comparison charts ─────────────────────────────────────────────────────────

def _save_comparison_chart(metrics_list: List[Dict]):
    names = [m["name"] for m in metrics_list]
    acc = [m["accuracy"] for m in metrics_list]
    f1w = [m["f1_weighted"] for m in metrics_list]
    f1m = [m["f1_macro"] for m in metrics_list]

    x = np.arange(len(names))
    width = 0.25

    fig, ax = plt.subplots(figsize=(14, 6))
    ax.bar(x - width, acc, width, label="Accuracy", color="#2563EB")
    ax.bar(x, f1w, width, label="F1 Weighted", color="#10B981")
    ax.bar(x + width, f1m, width, label="F1 Macro", color="#F59E0B")

    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=15, ha="right")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_title("Model Performance Comparison")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)
    for bar in ax.patches:
        h = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            h + 0.005,
            f"{h:.3f}",
            ha="center", va="bottom", fontsize=7,
        )
    plt.tight_layout()
    path = PLOTS_DIR / "model_comparison_chart.png"
    fig.savefig(path, dpi=100, bbox_inches="tight")
    plt.close(fig)


def _save_cv_boxplot(training_results: Dict):
    names, scores = [], []
    for mid, res in training_results.items():
        if "cv_scores" in res and res["cv_scores"] is not None:
            names.append(MODEL_NAMES.get(mid, mid))
            scores.append(res["cv_scores"])

    if not names:
        return

    fig, ax = plt.subplots(figsize=(12, 5))
    bp = ax.boxplot(scores, patch_artist=True, notch=False)
    for patch, color in zip(bp["boxes"], CHART_COLORS[:len(names)]):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    ax.set_xticklabels(names, rotation=15, ha="right")
    ax.set_ylabel("F1-Weighted (CV)")
    ax.set_title("Cross-Validation Score Distribution")
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    path = PLOTS_DIR / "cv_boxplot.png"
    fig.savefig(path, dpi=100, bbox_inches="tight")
    plt.close(fig)


# ── Main evaluation entry-point ────────────────────────────────────────────────

def evaluate_all_models(
    trained_results: Dict,
    X_test: np.ndarray,
    y_test: np.ndarray,
    class_labels: List[str],
    feature_names: List[str],
) -> Dict:
    print("\n" + "=" * 60)
    print("  EVALUATING MODELS")
    print("=" * 60)

    metrics_list: List[Dict] = []
    confusion_matrices: Dict = {}
    roc_data_all: Dict = {}

    for model_id, res in trained_results.items():
        estimator = res["model"]
        name = MODEL_NAMES.get(model_id, model_id)
        print(f"\n[EVALUATOR] -- {name} --")

        metrics = _compute_metrics(
            model_id=model_id,
            estimator=estimator,
            X_test=X_test,
            y_test=y_test,
            class_labels=class_labels,
            cv_mean=res.get("cv_mean", 0.0),
            cv_std=res.get("cv_std", 0.0),
            training_time=res.get("training_time_seconds", 0.0),
        )
        metrics_list.append(metrics)
        print(f"[EVALUATOR]  Acc={metrics['accuracy']:.4f}  "
              f"F1w={metrics['f1_weighted']:.4f}  "
              f"F1m={metrics['f1_macro']:.4f}  "
              f"AUC={metrics.get('roc_auc', 'N/A')}")

        y_pred = estimator.predict(X_test)
        cm_raw, cm_norm = _save_confusion_matrix(model_id, y_test, y_pred, class_labels)
        confusion_matrices[model_id] = {
            "matrix": cm_raw,
            "normalized_matrix": cm_norm,
            "labels": class_labels,
        }

        roc_data_all[model_id] = _compute_roc_data(estimator, X_test, y_test, class_labels)
        _save_feature_importance(model_id, estimator, feature_names)

    _print_comparison_table(metrics_list)
    _save_comparison_chart(metrics_list)
    _save_cv_boxplot(trained_results)

    best = max(metrics_list, key=lambda m: m["f1_weighted"])
    print(f"\n[EVALUATOR] Best model: {best['name']} "
          f"(F1-weighted = {best['f1_weighted']:.4f})")

    result = {
        "models": metrics_list,
        "best_model": best["name"],
        "best_model_id": best["id"],
        "best_metric": "f1_weighted",
        "best_value": best["f1_weighted"],
        "confusion_matrices": confusion_matrices,
        "roc_data": roc_data_all,
    }

    MODEL_COMPARISON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_COMPARISON_PATH, "w") as f:
        json.dump(result, f, indent=2, default=str)
    print(f"[EVALUATOR] Saved model comparison -> {MODEL_COMPARISON_PATH}")

    return result


def _print_comparison_table(metrics_list: List[Dict]):
    rows = []
    for m in metrics_list:
        rows.append([
            m["name"],
            f"{m['accuracy']:.4f}",
            f"{m['precision']:.4f}",
            f"{m['recall']:.4f}",
            f"{m['f1_weighted']:.4f}",
            f"{m['f1_macro']:.4f}",
            f"{m.get('roc_auc') or 'N/A'}",
            f"{m['cohens_kappa']:.4f}",
            f"{m['mcc']:.4f}",
            f"{m.get('log_loss') or 'N/A'}",
            f"{m['cv_mean']:.4f}+/-{m['cv_std']:.4f}",
            f"{m['training_time_seconds']:.1f}s",
        ])
    headers = [
        "Model", "Acc", "Prec", "Recall",
        "F1-W", "F1-M", "AUC", "Kappa", "MCC", "LogLoss",
        "CV Mean+/-Std", "Time",
    ]
    print("\n" + tabulate(rows, headers=headers, tablefmt="fancy_grid"))