import pandas as pd
import numpy as np
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier

print("Loading dataset...")
df = pd.read_csv("data/Malware_Analysis.csv")
df = df.dropna(subset=["Score"])
print(f"Loaded {len(df)} rows")

api_cols      = [c for c in df.columns if c.startswith("API_")]
behavior_cols = ["file_deleted","file_created","resolves_host",
                 "file_opened","file_read","file_written",
                 "dll_loaded_count","regkey_read","directory_enumerated"]
dll_cols      = [c for c in df.columns if c.startswith("dll_freq_")]
yara_cols     = [c for c in df.columns if c.startswith("rule_")]

feature_cols = api_cols + behavior_cols + dll_cols + yara_cols
print(f"Features: {len(feature_cols)}")

X = df[feature_cols].fillna(0).astype(float)
y = (df["Score"] >= 5).astype(int)

print(f"Malicious: {y.sum()} | Clean: {(y==0).sum()}")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

scaler     = StandardScaler()
X_train_sc = scaler.fit_transform(X_train)
X_test_sc  = scaler.transform(X_test)

print("Training XGBoost...")
xgb = XGBClassifier(
    n_estimators=300, max_depth=6, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    use_label_encoder=False, eval_metric="logloss",
    random_state=42, n_jobs=-1
)
xgb.fit(X_train, y_train)

print("Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=200, max_depth=12,
    min_samples_leaf=2, n_jobs=-1, random_state=42
)
rf.fit(X_train, y_train)

print("Training Isolation Forest...")
iso = IsolationForest(
    n_estimators=100, contamination=0.15,
    random_state=42, n_jobs=-1
)
iso.fit(X_train_sc)

print("\n=== XGBoost Results ===")
print(classification_report(y_test, xgb.predict(X_test)))

print("=== Random Forest Results ===")
print(classification_report(y_test, rf.predict(X_test)))

joblib.dump(xgb,          "models/xgb.pkl")
joblib.dump(rf,           "models/rf.pkl")
joblib.dump(iso,          "models/iso.pkl")
joblib.dump(scaler,       "models/scaler.pkl")
joblib.dump(feature_cols, "models/features.pkl")

print("\nAll models saved to models/")