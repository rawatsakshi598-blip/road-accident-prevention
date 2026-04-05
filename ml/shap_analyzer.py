"""
SHAP explainability analysis for the best model.
Generates summary plot, bar plot, dependence plots, and feature importance JSON.
"""

import json
import warnings
from pathlib import Path
from typing import Dict, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import shap

from config import PLOTS_DIR, SHAP_IMPORTANCE_PATH

warnings.filterwarnings("ignore")

plt.rcParams.update({
    "figure.facecolor": "#1B1B2F",
    "axes.facecolor": "#1F2940",
    "axes.edgecolor": "#2D3748",
    "axes.labelcolor": "#FFFFFF",
    "xtick.color": "#8899A6",
    "ytick.color": "#8899A6",
    "text.color": "#FFFFFF",
})


def _get_explainer(model_id, estimator, X_sample):
    """Choose the right SHAP explainer based on model type."""
    tree_models = {"RF", "XGB", "GBM", "LGBM"}
    if model_id in tree_models:
        try:
            return shap.TreeExplainer(estimator)
        except Exception:
            pass
    if model_id == "LR":
        try:
            return shap.LinearExplainer(estimator, X_sample)
        except Exception:
            pass
    bg = shap.sample(X_sample, min(100, len(X_sample)))
    return shap.KernelExplainer(estimator.predict_proba, bg)


def run_shap_analysis(model_id, estimator, X_test, feature_names, top_n=15, max_samples=500):
    """
    Run SHAP analysis on the best model.
    Returns a dict with feature importance data.
    """
    print(f"\n[SHAP] Computing SHAP values for {model_id} ...")

    # Ensure feature_names is a plain Python list
    feature_names = list(feature_names)

    n = min(max_samples, len(X_test))
    idx = np.random.choice(len(X_test), n, replace=False)
    X_sample = X_test[idx]

    try:
        explainer = _get_explainer(model_id, estimator, X_sample)
        shap_values = explainer.shap_values(X_sample)
    except Exception as exc:
        print(f"[SHAP] ERROR: SHAP computation failed: {exc}")
        return {"features": [], "model": model_id, "error": str(exc)}

    # ── Reduce shap_values to 2D (n_samples, n_features) ─────────────────
    if isinstance(shap_values, list):
        shap_abs_mean = np.mean([np.abs(sv) for sv in shap_values], axis=0)
    elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
        shap_abs_mean = np.abs(shap_values).mean(axis=0)
    else:
        shap_abs_mean = np.abs(shap_values)

    # ── Reduce to 1D global importance (n_features,) ─────────────────────
    if shap_abs_mean.ndim == 2:
        global_importance = shap_abs_mean.mean(axis=0)
    elif shap_abs_mean.ndim == 1:
        global_importance = shap_abs_mean
    else:
        global_importance = shap_abs_mean.reshape(-1, shap_abs_mean.shape[-1]).mean(axis=0)

    # Ensure 1D numpy array
    global_importance = np.asarray(global_importance).flatten()

    sorted_idx = np.argsort(global_importance)[::-1][:top_n]

    # Build top features list with explicit int conversion
    top_features = []
    for i in sorted_idx:
        i = int(i)
        name = feature_names[i] if i < len(feature_names) else f"feature_{i}"
        imp = round(float(global_importance[i]), 6)
        top_features.append({"name": name, "importance": imp})

    # ── Helper to get 2D shap values for plotting ────────────────────────
    def _get_sv_2d():
        if isinstance(shap_values, list):
            return shap_values[0]
        elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
            return shap_values[0]
        return shap_values

    # ── Summary beeswarm plot ─────────────────────────────────────────────
    try:
        fig, ax = plt.subplots(figsize=(10, 7))
        shap.summary_plot(
            _get_sv_2d(), X_sample,
            feature_names=feature_names,
            show=False,
            max_display=top_n,
            plot_type="dot",
        )
        plt.tight_layout()
        path = PLOTS_DIR / "shap_summary_plot.png"
        plt.savefig(path, dpi=100, bbox_inches="tight", facecolor="#1B1B2F")
        plt.close("all")
        print(f"[SHAP] Saved beeswarm -> {path}")
    except Exception as exc:
        print(f"[SHAP] WARNING: Beeswarm plot failed: {exc}")

    # ── Bar plot ──────────────────────────────────────────────────────────
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        names_plot = [f["name"] for f in top_features][::-1]
        vals_plot = [f["importance"] for f in top_features][::-1]
        colors = plt.cm.RdBu_r(np.linspace(0.2, 0.8, len(names_plot)))
        ax.barh(names_plot, vals_plot, color=colors)
        ax.set_xlabel("Mean |SHAP Value|")
        ax.set_title(f"SHAP Feature Importance - Top {top_n}")
        plt.tight_layout()
        path = PLOTS_DIR / "shap_bar_plot.png"
        fig.savefig(path, dpi=100, bbox_inches="tight")
        plt.close(fig)
        print(f"[SHAP] Saved bar plot -> {path}")
    except Exception as exc:
        print(f"[SHAP] WARNING: Bar plot failed: {exc}")

    # ── Dependence plots for top 3 features ──────────────────────────────
    try:
        top3_idx = sorted_idx[:3]
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        sv_dep = _get_sv_2d()
        for ax, feat_idx in zip(axes, top3_idx):
            feat_idx = int(feat_idx)
            feat_name = feature_names[feat_idx] if feat_idx < len(feature_names) else str(feat_idx)
            shap.dependence_plot(
                feat_idx, sv_dep, X_sample,
                feature_names=feature_names,
                ax=ax, show=False,
            )
            ax.set_title(feat_name, fontsize=9)
        plt.suptitle("SHAP Dependence Plots - Top 3 Features", y=1.01)
        plt.tight_layout()
        path = PLOTS_DIR / "shap_dependence_top3.png"
        fig.savefig(path, dpi=100, bbox_inches="tight")
        plt.close(fig)
        print(f"[SHAP] Saved dependence plots -> {path}")
    except Exception as exc:
        print(f"[SHAP] WARNING: Dependence plots failed: {exc}")

    # ── Save results ─────────────────────────────────────────────────────
    result = {"model": model_id, "features": top_features}
    SHAP_IMPORTANCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SHAP_IMPORTANCE_PATH, "w") as f:
        json.dump(result, f, indent=2)
    print(f"[SHAP] Saved feature importance JSON -> {SHAP_IMPORTANCE_PATH}")

    return result