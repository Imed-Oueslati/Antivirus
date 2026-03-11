import numpy as np
import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List

print("Loading AI models...")
try:
    xgb      = joblib.load("models/xgb.pkl")
    rf       = joblib.load("models/rf.pkl")
    iso      = joblib.load("models/iso.pkl")
    scaler   = joblib.load("models/scaler.pkl")
    features = joblib.load("models/features.pkl")
    print(f"Models loaded — {len(features)} features ready")
except FileNotFoundError:
    print("Models not found! Run: python train.py first")
    raise

app = FastAPI(title="AV-System AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    features: Dict[str, float] = {}
    filename: Optional[str] = None
    filepath: Optional[str] = None
    source:   Optional[str] = "disk"

class ScanResult(BaseModel):
    is_malicious:   bool
    threat_score:   float
    verdict:        str
    threat_type:    str
    confidence:     float
    anomaly_score:  float
    top_indicators: List[str]
    xgb_score:      float
    rf_score:       float

@app.post("/scan", response_model=ScanResult)
async def scan_file(req: ScanRequest):
    vec  = np.array([req.features.get(f, 0.0) for f in features])
    X    = vec.reshape(1, -1)
    X_sc = scaler.transform(X)

    xgb_score = float(xgb.predict_proba(X)[0][1])
    rf_score  = float(rf.predict_proba(X)[0][1])
    iso_score = float(iso.decision_function(X_sc)[0])

    threat_score = round(min(
        xgb_score * 0.50 +
        rf_score  * 0.40 +
        max(0.0, -iso_score) * 0.10,
        1.0
    ), 4)

    if threat_score >= 0.75:
        verdict = "MALICIOUS"
    elif threat_score >= 0.40:
        verdict = "SUSPICIOUS"
    else:
        verdict = "CLEAN"

    importances    = rf.feature_importances_
    impact         = importances * vec
    top_indices    = np.argsort(impact)[-5:][::-1]
    top_indicators = [
        f"{features[i]} = {vec[i]:.0f}"
        for i in top_indices if vec[i] > 0
    ]

    return ScanResult(
        is_malicious   = threat_score >= 0.5,
        threat_score   = threat_score,
        verdict        = verdict,
        threat_type    = _get_type(req.features),
        confidence     = round(abs(threat_score - 0.5) * 2, 4),
        anomaly_score  = round(iso_score, 4),
        top_indicators = top_indicators,
        xgb_score      = round(xgb_score, 4),
        rf_score       = round(rf_score,  4),
    )

@app.post("/scan/batch")
async def scan_batch(requests: List[ScanRequest]):
    results = []
    for req in requests:
        result = await scan_file(req)
        results.append({"filename": req.filename, "result": result.dict()})
    return results

@app.get("/health")
async def health():
    return {"status": "ok", "models": ["xgb", "rf", "iso"], "features": len(features)}

@app.get("/features")
async def get_features():
    return {"features": features, "count": len(features)}

def _get_type(f: dict) -> str:
    if f.get("API_CryptEncrypt", 0) > 0 and f.get("file_written", 0) > 10:
        return "ransomware"
    if f.get("API_GetAsyncKeyState", 0) > 0 or f.get("API_SetWindowsHookExA", 0) > 0:
        return "keylogger"
    if f.get("API_CreateRemoteThread", 0) > 0 or f.get("API_WriteProcessMemory", 0) > 0:
        return "trojan"
    if f.get("API_InternetConnectA", 0) > 0 or f.get("API_InternetConnectW", 0) > 0:
        return "spyware"
    if f.get("API_NtProtectVirtualMemory", 0) > 5:
        return "packer"
    if f.get("API_CreateServiceA", 0) > 0:
        return "rootkit"
    if f.get("resolves_host", 0) > 5 and f.get("API_WSAConnect", 0) > 0:
        return "botnet"
    return "unknown"