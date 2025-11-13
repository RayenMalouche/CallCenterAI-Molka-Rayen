import React, { useState } from 'react';
import { Send, AlertCircle, CheckCircle, Brain, Zap, Globe, Shield } from 'lucide-react';

export default function CallCenterAI() {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forceModel, setForceModel] = useState<string>('');

  const API_URL = 'http://localhost:8000';

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          force_model: forceModel || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
  let errorMessage: string = 'Failed to classify ticket';

  if (err instanceof Error) {
    errorMessage = err.message;
  } else if (typeof err === 'string') {
    errorMessage = err;
  }
  // If err is something else (rare), we still fall back to default message

  setError(errorMessage);  // Now 100% safe: string → SetStateAction<string | null>
  console.error('Error:', err);
} finally {
  setLoading(false);
}
  };

  const getRoutingReasonText = (reason: string): string => {
    const reasons: Record<string, string> = {
      'short_simple_text': 'Short and simple text',
      'high_confidence_tfidf': 'High confidence with TF-IDF',
      'low_confidence_tfidf': 'Low TF-IDF confidence, using Transformer',
      'long_complex_text': 'Long and complex text',
      'multilingual_detected': 'Multilingual content detected',
      'fallback': 'Fallback to Transformer'
    };
    return reasons[reason] || reason;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const examples = [
    "My laptop screen is broken and needs replacement",
    "Cannot login to my account, password reset not working",
    "Need to order new office supplies for the team",
    "Mon ordinateur portable ne fonctionne plus",
    "الحاسوب المحمول لا يعمل"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-3 rounded-xl">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">CallCenterAI</h1>
                <p className="text-gray-600">Intelligent Ticket Classification System</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-lg">
                <Zap className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">TF-IDF + SVM</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
                <Brain className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Transformer</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">PII Protection</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">Multilingual Support</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">Smart Routing</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Classify Ticket</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={6}
                  placeholder="Enter ticket description..."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Force Model (Optional)
                </label>
                <select
                  value={forceModel}
                  onChange={(e) => setForceModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Auto (Smart Routing)</option>
                  <option value="tfidf">TF-IDF + SVM</option>
                  <option value="transformer">Transformer</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Classifying...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Classify Ticket
                  </>
                )}
              </button>
            </div>

            {/* Examples */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Try these examples:</p>
              <div className="space-y-2">
                {examples.map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setText(example)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Classification Result</h2>
            
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                  <p className="text-xs text-red-600 mt-2">
                    Make sure the API is running at {API_URL}
                  </p>
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Main Prediction */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Category</span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">{result.label}</p>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Confidence</span>
                      <span className={`font-bold ${getConfidenceColor(result.confidence)}`}>
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${result.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Routing Info */}
                {result.routing && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <h3 className="font-semibold text-gray-900">Routing Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Model Used:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {result.routing.chosen_model === 'tfidf' ? (
                            <Zap className="w-4 h-4 text-green-600" />
                          ) : (
                            <Brain className="w-4 h-4 text-purple-600" />
                          )}
                          <span className="font-medium text-gray-900">
                            {result.routing.chosen_model.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Text Length:</span>
                        <p className="font-medium text-gray-900 mt-1">
                          {result.routing.text_length} chars
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Multilingual:</span>
                        <p className="font-medium text-gray-900 mt-1">
                          {result.routing.has_multilingual ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">PII Scrubbed:</span>
                        <p className="font-medium text-gray-900 mt-1">
                          {result.routing.pii_scrubbed ? 'Yes' : 'No'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-600 text-sm">Reason:</span>
                      <p className="text-gray-900 font-medium mt-1">
                        {getRoutingReasonText(result.routing.reason)}
                      </p>
                    </div>
                  </div>
                )}

                {/* All Scores */}
                {result.all_scores && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">All Category Scores</h3>
                    {Object.entries(result.all_scores as Record<string, number>)
                          .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
                          .slice(0, 5)
                          .map(([category, score]) => (
                            <div key={category} className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-700">{category}</span>
                                  <span className="text-gray-900 font-medium">
                                    {(score * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                      category === result.label ? 'bg-indigo-600' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${score * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
                  <p>Processing Time: {(result.processing_time * 1000).toFixed(2)}ms</p>
                  <p>Timestamp: {new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )}

            {!result && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Brain className="w-16 h-16 mb-4" />
                <p>No results yet</p>
                <p className="text-sm">Enter a ticket to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>CallCenterAI - MLOps Project 2025 | ENSIT</p>
          <p className="mt-1">
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              API Documentation
            </a>
            {' · '}
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              Grafana Dashboard
            </a>
            {' · '}
            <a href="http://localhost:5000" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              MLflow
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}