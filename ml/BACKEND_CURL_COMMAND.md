PS C:\accident-api> & c:\accident-api\venv\Scripts\Activate.ps1
(venv) PS C:\accident-api> curl http://localhost:8000/api/health
                                                                                                                                      Security Warning: Script Execution Risk                                                                                               Invoke-WebRequest parses the content of the web page. Script code in the web page might be run when the page is parsed.                     RECOMMENDED ACTION:                                                                                                             
      Use the -UseBasicParsing switch to avoid script code execution.

      Do you want to continue?
    
[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [S] Suspend  [?] Help (default is "N"): y


StatusCode        : 200                                                                                                               StatusDescription : OK                                                                                                                Content           : {"status":"healthy","models_loaded":true,"loaded_model_ids":["RF","XGB","GBM","LGBM","LR","SVM","KNN"],"timestamp                     ":"2026-03-28T06:21:00.053083Z"}                                                                                  
RawContent        : HTTP/1.1 200 OK
                    Content-Length: 145
                    Content-Type: application/json
                    Date: Sat, 28 Mar 2026 06:20:58 GMT
                    Server: uvicorn

                    {"status":"healthy","models_loaded":true,"loaded_model_ids":["RF","XGB","G...
Forms             : {}
Headers           : {[Content-Length, 145], [Content-Type, application/json], [Date, Sat, 28 Mar 2026 06:20:58 GMT], [Server, 
                    uvicorn]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        : mshtml.HTMLDocumentClass
RawContentLength  : 145



(venv) PS C:\accident-api> curl -UseBasicParsing http://localhost:8000/api/models/comparison

(venv) PS C:\accident-api> curl -UseBasicParsing http://localhost:8000/api/models/comparison



StatusCode        : 200
StatusDescription : OK
Content           : {"models":[{"id":"RF","name":"Random Forest","accuracy":0.8196,"precision":0.8212,"recall":0.8196,"f1_weighted":0
                    .819,"f1_macro":0.8073,"cohens_kappa":0.7378,"mcc":0.7383,"roc_auc":0.9363,"log_loss":0...
RawContent        : HTTP/1.1 200 OK
                    Content-Length: 1891
                    Content-Type: application/json
                    Date: Sat, 28 Mar 2026 06:24:55 GMT
                    Server: uvicorn

                    {"models":[{"id":"RF","name":"Random Forest","accuracy":0.8196,"precision...
Forms             :
Headers           : {[Content-Length, 1891], [Content-Type, application/json], [Date, Sat, 28 Mar 2026 06:24:55 GMT], [Server,      
                    uvicorn]}
Images            : {}
InputFields       : {}
Links             : {}
ParsedHtml        :
RawContentLength  : 1891
(venv) PS C:\accident-api> Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body '{"Day_of_Week":7,"Time_of_Accident":"18:30","Accident_Location_A":1,"Accident_Location_A_Chainage_km":187.6,"Accident_Location_A_Chainage_km_RoadSide":1,"Causes_D":2,"Road_Feature_E":2,"Road_Condition_F":3,"Weather_Conditions_H":8,"Vehicle_Type_Involved_J_V1":1,"Vehicle_Type_Involved_J_V2":5.0,"model_name":"GBM"}'


prediction       : Minor Injury
prediction_code  : 3
confidence       : 0.8305
probabilities    : @{Fatal=0.0027; Grievous Injury=0.1646; Minor Injury=0.8305; No Injury=0.0022}
top_risk_factors : {@{feature=Accident_Location_A; value=1; contribution=0.021317}, @{feature=Accident_Location_A_Chainage_km;      
                   value=1; contribution=0.020409}, @{feature=Accident_Location_A_Chainage_km_RoadSide; value=1;
                   contribution=0.016829}}
model_used       : Gradient Boosting
model_accuracy   : 0.8645
dataset          : NHAI Multi-Corridor
dataset_records  : 8116



(venv) PS C:\accident-api> $models = @("GBM","XGB","RF","LGBM","LR","SVM","KNN")
>> $body = '{"Day_of_Week":7,"Time_of_Accident":"18:30","Accident_Location_A":1,"Accident_Location_A_Chainage_km":187.6,"Accident_Location_A_Chainage_km_RoadSide":1,"Causes_D":2,"Road_Feature_E":2,"Road_Condition_F":3,"Weather_Conditions_H":8,"Vehicle_Type_Involved_J_V1":1,"Vehicle_Type_Involved_J_V2":5.0,"model_name":"XXX"}'
>>
>> foreach($m in $models){
>>     Write-Host "`n=== $m ===" -ForegroundColor Green
>>     $b = $body -replace "XXX", $m
>>     try {
>>         $r = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body $b      
>>         Write-Host "Model      : $($r.model_used)" -ForegroundColor Cyan
>>         Write-Host "Prediction : $($r.prediction)" -ForegroundColor Yellow
>>         Write-Host "Confidence : $($r.confidence)" -ForegroundColor Yellow
>>         Write-Host "Accuracy   : $($r.model_accuracy)" -ForegroundColor Yellow
>>     } catch {
>>         Write-Host "ERROR: $_" -ForegroundColor Red
>>     }
>> }

=== GBM ===
Model      : Gradient Boosting
Prediction : Minor Injury
Confidence : 0.8305
Accuracy   : 0.8645

=== XGB ===
Model      : XGBoost
Prediction : Minor Injury
Confidence : 0.9209
Accuracy   : 0.8571

=== RF ===
Model      : Random Forest
Prediction : Minor Injury
Confidence : 0.4145
Accuracy   : 0.8196

=== LGBM ===
Model      : LightGBM
Prediction : Minor Injury
Confidence : 0.9738
Accuracy   : 0.8122

=== LR ===
Model      : Logistic Regression
Prediction : Minor Injury
Confidence : 0.3753
Accuracy   : 0.3337

=== SVM ===
Model      : Support Vector Machine
Prediction : Minor Injury
Confidence : 0.4445
Accuracy   : 0.4384

=== KNN ===
Model      : K-Nearest Neighbors
Prediction : No Injury
Confidence : 0.5706
Accuracy   : 0.8596
Accuracy   : 0.8596
Accuracy   : 0.8596
(venv) PS C:\accident-api> $models = @("GBM","XGB","RF","LGBM","KNN")
Accuracy   : 0.8596
(venv) PS C:\accident-api> $models = @("GBM","XGB","RF","LGBM","KNN")
>> $body = '{"Day_of_Week":1,"Time_of_Accident":"02:30","Accident_Location_A":2,"Accident_Location_A_Chainage_km":50.0,"Accident_Location_A_Chainage_km_RoadSide":2,"Causes_D":1,"Road_Feature_E":3,"Road_Condition_F":6,"Weather_Conditions_H":12,"Vehicle_Type_Involved_J_V1":5,"Vehicle_Type_Involved_J_V2":1.0,"model_name":"XXX"}'
>>
>> Write-Host "`n=== NIGHT ACCIDENT SCENARIO ===" -ForegroundColor Magenta
>> foreach($m in $models){
>>     $b = $body -replace "XXX", $m
>>     try {
>>         $r = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body $b      
>>         Write-Host "$($r.model_used.PadRight(25)) -> $($r.prediction.PadRight(20)) (Conf: $($r.confidence))" -ForegroundColor Cyan
>>     } catch {
>>         Write-Host "ERROR with $m" -ForegroundColor Red
>>     }
>> }

=== NIGHT ACCIDENT SCENARIO ===
Gradient Boosting         -> Grievous Injury      (Conf: 0.9447)
XGBoost                   -> Grievous Injury      (Conf: 0.519)
Random Forest             -Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body '{"Day_of_Week":1,"Time_of_Accident":"03:00","Accident_Location_A":2,"Accident_Location_A_Chainage_km":50.0,"Accident_Location_A_Chainage_km_RoadSide":2,"Causes_D":1,"Road_Feature_E":4,"Road_Condition_F":7,"Weather_Conditions_H":12,"Vehicle_Type_Involved_J_V1":6,"Vehicle_Type_Involved_J_V2":1.0,"model_name":"GBM"}'


prediction       : Grievous Injury
prediction_code  : 2
confidence       : 0.6317
probabilities    : @{Fatal=0.1137; Grievous Injury=0.6317; Minor Injury=0.2445; No Injury=0.0101}
top_risk_factors : {@{feature=Accident_Location_A; value=2; contribution=0.021317}, @{feature=Accident_Location_A_Chainage_km;      
                   value=2; contribution=0.020409}, @{feature=Accident_Location_A_Chainage_km_RoadSide; value=2;
                   contribution=0.016829}}
model_used       : Gradient Boosting
model_accuracy   : 0.8645
dataset          : NHAI Multi-Corridor
dataset_records  : 8116



(venv) PS C:\accident-api> Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body '{"Day_of_Week":3,"Time_of_Accident":"10:00","Accident_Location_A":1,"Accident_Location_A_Chainage_km":100.0,"Accident_Location_A_Chainage_km_RoadSide":1,"Causes_D":3,"Road_Feature_E":1,"Road_Condition_F":1,"Weather_Conditions_H":7,"Vehicle_Type_Involved_J_V1":1,"Vehicle_Type_Involved_J_V2":1.0,"model_name":"GBM"}'


prediction       : Grievous Injury
prediction_code  : 2
confidence       : 0.5774
probabilities    : @{Fatal=0.0263; Grievous Injury=0.5774; Minor Injury=0.3363; No Injury=0.06}
top_risk_factors : {@{feature=Accident_Location_A; value=1; contribution=0.021317}, @{feature=Accident_Location_A_Chainage_km;      
                   value=1; contribution=0.020409}, @{feature=Accident_Location_A_Chainage_km_RoadSide; value=1;
                   contribution=0.016829}}
model_used       : Gradient Boosting
model_accuracy   : 0.8645
dataset          : NHAI Multi-Corridor
dataset_records  : 8116



(venv) PS C:\accident-api> Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body '{"Day_of_Week":6,"Time_of_Accident":"23:45","Accident_Location_A":2,"Accident_Location_A_Chainage_km":200.0,"Accident_Location_A_Chainage_km_RoadSide":2,"Causes_D":4,"Road_Feature_E":3,"Road_Condition_F":5,"Weather_Conditions_H":10,"Vehicle_Type_Involved_J_V1":2,"Vehicle_Type_Involved_J_V2":7.0,"model_name":"GBM"}'


prediction       : Minor Injury
prediction_code  : 3
confidence       : 0.9207
probabilities    : @{Fatal=0.0037; Grievous Injury=0.0393; Minor Injury=0.9207; No Injury=0.0363}
top_risk_factors : {@{feature=Accident_Location_A; value=2; contribution=0.021317}, @{feature=Accident_Location_A_Chainage_km;      
                   value=2; contribution=0.020409}, @{feature=Accident_Location_A_Chainage_km_RoadSide; value=2;
                   contribution=0.016829}}
model_used       : Gradient Boosting
model_accuracy   : 0.8645
dataset          : NHAI Multi-Corridor
dataset_records  : 8116



(venv) PS C:\accident-api> $scenarios = @(
>>     @{name="Morning Commute"; body='{"Day_of_Week":2,"Time_of_Accident":"08:30","Accident_Location_A":1,"Accident_Location_A_Chainage_km":120.0,"Accident_Location_A_Chainage_km_RoadSide":1,"Causes_D":2,"Road_Feature_E":1,"Road_Condition_F":1,"Weather_Conditions_H":7,"Vehicle_Type_Involved_J_V1":1,"Vehicle_Type_Involved_J_V2":1.0,"model_name":"GBM"}'},
>>     @{name="Rainy Night"; body='{"Day_of_Week":5,"Time_of_Accident":"22:00","Accident_Location_A":2,"Accident_Location_A_Chainage_km":80.0,"Accident_Location_A_Chainage_km_RoadSide":2,"Causes_D":1,"Road_Feature_E":3,"Road_Condition_F":6,"Weather_Conditions_H":10,"Vehicle_Type_Involved_J_V1":5,"Vehicle_Type_Involved_J_V2":2.0,"model_name":"GBM"}'},
>>     @{name="Highway Truck Crash"; body='{"Day_of_Week":4,"Time_of_Accident":"04:00","Accident_Location_A":1,"Accident_Location_A_Chainage_km":300.0,"Accident_Location_A_Chainage_km_RoadSide":1,"Causes_D":1,"Road_Feature_E":2,"Road_Condition_F":4,"Weather_Conditions_H":8,"Vehicle_Type_Involved_J_V1":6,"Vehicle_Type_Involved_J_V2":6.0,"model_name":"GBM"}'},
>>     @{name="Weekend Afternoon"; body='{"Day_of_Week":7,"Time_of_Accident":"14:00","Accident_Location_A":1,"Accident_Location_A_Chainage_km":150.0,"Accident_Location_A_Chainage_km_RoadSide":1,"Causes_D":3,"Road_Feature_E":1,"Road_Condition_F":1,"Weather_Conditions_H":7,"Vehicle_Type_Involved_J_V1":1,"Vehicle_Type_Involved_J_V2":3.0,"model_name":"GBM"}'}
>> )
>>
>> Write-Host "`n=== COMPARING DIFFERENT SCENARIOS ===" -ForegroundColor Magenta
>> foreach($s in $scenarios){
>>     try {
>>         $r = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/predict -ContentType "application/json" -Body $s.body 
>>         Write-Host "$($s.name.PadRight(25)) -> $($r.prediction.PadRight(20)) (Conf: $($r.confidence))" -ForegroundColor Cyan     
>>     } catch {
>>         Write-Host "ERROR: $($s.name)" -ForegroundColor Red
>>     }
>> }

=== COMPARING DIFFERENT SCENARIOS ===
Morning Commute           -> Minor Injury         (Conf: 0.4949)
Rainy Night               -> Grievous Injury      (Conf: 0.9078)
Highway Truck Crash       -> Minor Injury         (Conf: 0.9211)
Weekend Afternoon         -> Grievous Injury      (Conf: 0.7102)