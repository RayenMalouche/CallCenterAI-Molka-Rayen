"""
CallCenterAI - Intelligent Ticket Classification System
Copyright (c) 2025 Rayen Malouche - Molka Toubale
Licensed under the MIT License (see LICENSE file for details)
SPDX-License-Identifier: MIT
"""
"""
TF-IDF + SVM Training Script for CallCenterAI
Train a fast, traditional NLP model for ticket classification
"""

import os
import pickle
import json
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, 
    f1_score, 
    classification_report,
    confusion_matrix
)
import matplotlib.pyplot as plt
import seaborn as sns

# ==================== Configuration ====================
CONFIG = {
    "data_path": "data/all_tickets_cleaned.csv",
    "output_dir": "models/tfidf",
    "test_size": 0.2,
    "random_state": 42,
    
    # TF-IDF parameters
    "max_features": 10000,
    "ngram_range": (1, 2),  # Unigrams and bigrams
    "min_df": 2,
    "max_df": 0.95,
    
    # SVM parameters
    "C": 1.0,
    "max_iter": 1000,
}

print("="*60)
print("TF-IDF + SVM TRAINING - CallCenterAI")
print("="*60)

# ==================== Load Data ====================
print("\n📂 Loading data...")
if not os.path.exists(CONFIG["data_path"]):
    raise FileNotFoundError(f"Data file not found: {CONFIG['data_path']}")

df = pd.read_csv(CONFIG["data_path"])
print(f"✅ Loaded {len(df)} samples")

# Validate columns
if "Document" not in df.columns or "Topic_group" not in df.columns:
    raise ValueError("Dataset must contain 'Document' and 'Topic_group' columns")

# Clean data
df = df.dropna(subset=["Document", "Topic_group"])
df = df[df["Document"].str.strip() != ""]
df = df[df["Topic_group"].str.strip() != ""]

print(f"✅ After cleaning: {len(df)} samples")
print(f"\n📊 Class Distribution:")
print(df["Topic_group"].value_counts())

# ==================== Prepare Data ====================
print("\n" + "="*60)
print("🔧 Preparing Data")
print("="*60)

X = df["Document"].values
y = df["Topic_group"].values

# Encode labels
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)
num_classes = len(label_encoder.classes_)

print(f"✅ Number of classes: {num_classes}")
print(f"📋 Classes: {list(label_encoder.classes_)}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded,
    test_size=CONFIG["test_size"],
    random_state=CONFIG["random_state"],
    stratify=y_encoded
)

print(f"✅ Train samples: {len(X_train)}")
print(f"✅ Test samples: {len(X_test)}")

# ==================== TF-IDF Vectorization ====================
print("\n" + "="*60)
print("🔤 TF-IDF Vectorization")
print("="*60)

vectorizer = TfidfVectorizer(
    max_features=CONFIG["max_features"],
    ngram_range=CONFIG["ngram_range"],
    min_df=CONFIG["min_df"],
    max_df=CONFIG["max_df"],
    strip_accents='unicode',
    lowercase=True,
    stop_words='english'
)

print("⏳ Fitting vectorizer on training data...")
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

print(f"✅ Vocabulary size: {len(vectorizer.vocabulary_)}")
print(f"✅ Feature matrix shape: {X_train_tfidf.shape}")

# ==================== Train SVM ====================
print("\n" + "="*60)
print("🤖 Training LinearSVM")
print("="*60)

print("⏳ Training model...")
svm = LinearSVC(
    C=CONFIG["C"],
    max_iter=CONFIG["max_iter"],
    random_state=CONFIG["random_state"],
    class_weight='balanced'
)

svm.fit(X_train_tfidf, y_train)
print("✅ SVM trained successfully")

# Calibrate for probability estimates
print("⏳ Calibrating classifier for probability estimates...")
calibrated_svm = CalibratedClassifierCV(svm, cv=3, method='sigmoid')
calibrated_svm.fit(X_train_tfidf, y_train)
print("✅ Calibration complete")

# ==================== Evaluate ====================
print("\n" + "="*60)
print("📊 Evaluation")
print("="*60)

# Predictions
y_pred = calibrated_svm.predict(X_test_tfidf)
y_pred_proba = calibrated_svm.predict_proba(X_test_tfidf)

# Metrics
accuracy = accuracy_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred, average='weighted')

print(f"✅ Accuracy: {accuracy:.4f}")
print(f"✅ F1 Score (weighted): {f1:.4f}")

# Detailed classification report
print("\n📋 Classification Report:")
print(classification_report(
    y_test, 
    y_pred,
    target_names=label_encoder.classes_
))

# ==================== Save Models ====================
print("\n" + "="*60)
print("💾 Saving Models")
print("="*60)

# Create output directory
output_dir = Path(CONFIG["output_dir"])
output_dir.mkdir(parents=True, exist_ok=True)

# Save vectorizer
vectorizer_path = output_dir / "vectorizer.pkl"
with open(vectorizer_path, 'wb') as f:
    pickle.dump(vectorizer, f)
print(f"✅ Saved vectorizer: {vectorizer_path}")

# Save model
model_path = output_dir / "model.pkl"
with open(model_path, 'wb') as f:
    pickle.dump(calibrated_svm, f)
print(f"✅ Saved model: {model_path}")

# Save label encoder
encoder_path = output_dir / "label_encoder.pkl"
with open(encoder_path, 'wb') as f:
    pickle.dump(label_encoder, f)
print(f"✅ Saved label encoder: {encoder_path}")

# Save metadata
metadata = {
    "accuracy": float(accuracy),
    "f1_score": float(f1),
    "num_classes": int(num_classes),
    "classes": list(label_encoder.classes_),
    "vocabulary_size": len(vectorizer.vocabulary_),
    "train_samples": len(X_train),
    "test_samples": len(X_test),
    "config": CONFIG
}

metadata_path = output_dir / "metadata.json"
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"✅ Saved metadata: {metadata_path}")

# ==================== Visualizations ====================
print("\n" + "="*60)
print("📊 Creating Visualizations")
print("="*60)

plots_dir = output_dir / "plots"
plots_dir.mkdir(exist_ok=True)

# 1. Confusion Matrix
print("⏳ Creating confusion matrix...")
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(12, 10))
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=label_encoder.classes_,
    yticklabels=label_encoder.classes_,
    cbar_kws={'label': 'Count'}
)
plt.xlabel('Predicted', fontsize=12, fontweight='bold')
plt.ylabel('True', fontsize=12, fontweight='bold')
plt.title('Confusion Matrix - TF-IDF + SVM', fontsize=14, fontweight='bold')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
cm_path = plots_dir / "confusion_matrix.png"
plt.savefig(cm_path, dpi=300, bbox_inches='tight')
plt.close()
print(f"✅ Saved: {cm_path}")

# 2. Per-class Performance
print("⏳ Creating per-class performance plot...")
report_dict = classification_report(
    y_test, 
    y_pred,
    target_names=label_encoder.classes_,
    output_dict=True
)

classes = label_encoder.classes_
precision = [report_dict[c]['precision'] for c in classes]
recall = [report_dict[c]['recall'] for c in classes]
f1_scores = [report_dict[c]['f1-score'] for c in classes]

x = np.arange(len(classes))
width = 0.25

fig, ax = plt.subplots(figsize=(14, 6))
ax.bar(x - width, precision, width, label='Precision', alpha=0.8)
ax.bar(x, recall, width, label='Recall', alpha=0.8)
ax.bar(x + width, f1_scores, width, label='F1-Score', alpha=0.8)

ax.set_xlabel('Class', fontweight='bold')
ax.set_ylabel('Score', fontweight='bold')
ax.set_title('Per-Class Performance - TF-IDF + SVM', fontsize=14, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(classes, rotation=45, ha='right')
ax.legend()
ax.grid(axis='y', alpha=0.3)
ax.set_ylim([0, 1.1])

plt.tight_layout()
perf_path = plots_dir / "per_class_performance.png"
plt.savefig(perf_path, dpi=300, bbox_inches='tight')
plt.close()
print(f"✅ Saved: {perf_path}")

# 3. Top Features per Class
print("⏳ Analyzing top features per class...")
feature_names = vectorizer.get_feature_names_out()
top_n = 10

fig, axes = plt.subplots(2, 4, figsize=(20, 10))
axes = axes.ravel()

for idx, class_name in enumerate(label_encoder.classes_):
    if idx >= len(axes):
        break
    
    # Get coefficients for this class
    coef = svm.coef_[idx]
    top_indices = coef.argsort()[-top_n:][::-1]
    top_features = [feature_names[i] for i in top_indices]
    top_scores = [coef[i] for i in top_indices]
    
    axes[idx].barh(range(top_n), top_scores, alpha=0.7)
    axes[idx].set_yticks(range(top_n))
    axes[idx].set_yticklabels(top_features)
    axes[idx].set_xlabel('Coefficient')
    axes[idx].set_title(f'{class_name}', fontweight='bold')
    axes[idx].invert_yaxis()

plt.suptitle('Top Features per Class - TF-IDF + SVM', fontsize=16, fontweight='bold')
plt.tight_layout()
features_path = plots_dir / "top_features.png"
plt.savefig(features_path, dpi=300, bbox_inches='tight')
plt.close()
print(f"✅ Saved: {features_path}")

# ==================== Summary ====================
print("\n" + "="*60)
print("🎉 TRAINING COMPLETE!")
print("="*60)
print(f"📊 Final Results:")
print(f"   • Accuracy: {accuracy:.4f}")
print(f"   • F1 Score: {f1:.4f}")
print(f"   • Model size: {os.path.getsize(model_path) / 1024:.2f} KB")
print(f"\n📁 All outputs saved to: {output_dir}")
print("="*60)