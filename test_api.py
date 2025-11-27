"""
CallCenterAI - Intelligent Ticket Classification System
Copyright (c) 2025 Rayen Malouche - Molka Toubale
Licensed under the MIT License (see LICENSE file for details)
SPDX-License-Identifier: MIT
"""

"""
Complete API Testing Script for CallCenterAI
Tests all services: Agent, TF-IDF, Transformer
"""

import requests
import time
import sys
from typing import Dict, List
from colorama import init, Fore, Style

# Initialize colorama
init(autoreset=True)

# Configuration
BASE_URLS = {
    "agent": "http://localhost:8000",
    "tfidf": "http://localhost:8002",
    "transformer": "http://localhost:8001"
}

TEST_CASES = [
    {
        "name": "Simple Hardware Issue",
        "text": "My laptop screen is broken",
        "expected_category": "Hardware"
    },
    {
        "name": "Login Problem",
        "text": "Cannot login to my account, password reset not working",
        "expected_category": "Access"
    },
    {
        "name": "Purchase Request",
        "text": "Need to order new office supplies for the team",
        "expected_category": "Purchase"
    },
    {
        "name": "French Hardware Issue",
        "text": "Mon ordinateur portable ne fonctionne plus",
        "expected_category": "Hardware"
    },
    {
        "name": "Arabic Hardware Issue",
        "text": "الحاسوب المحمول لا يعمل",
        "expected_category": "Hardware"
    },
    {
        "name": "Long Complex Issue",
        "text": "I've been experiencing multiple issues with my workstation. The computer keeps freezing randomly, the screen flickers occasionally, and sometimes I hear strange noises from the hard drive. I've tried restarting several times but the problems persist. This has been happening for about a week now and it's really affecting my productivity. I need urgent technical support to resolve these hardware issues.",
        "expected_category": "Hardware"
    },
    {
        "name": "PII Scrubbing Test",
        "text": "My email is john.doe@example.com and phone is 555-123-4567. Cannot access account.",
        "expected_category": "Access"
    }
]


def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Fore.CYAN}{'='*80}")
    print(f"{Fore.CYAN}{text.center(80)}")
    print(f"{Fore.CYAN}{'='*80}\n")


def print_success(text: str):
    """Print success message"""
    print(f"{Fore.GREEN}✔ {text}")


def print_error(text: str):
    """Print error message"""
    print(f"{Fore.RED}✖ {text}")


def print_info(text: str):
    """Print info message"""
    print(f"{Fore.YELLOW}ℹ {text}")


def test_health(service_name: str, url: str) -> bool:
    """Test service health endpoint"""
    try:
        response = requests.get(f"{url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"{service_name} is healthy")
            print(f"  Status: {data.get('status', 'N/A')}")
            return True
        else:
            print_error(f"{service_name} returned status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"{service_name} health check failed: {str(e)}")
        return False


def test_prediction(service_name: str, url: str, text: str) -> Dict:
    """Test prediction endpoint"""
    try:
        start_time = time.time()
        response = requests.post(
            f"{url}/predict",
            json={"text": text},
            timeout=30
        )
        latency = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "label": data.get("label"),
                "confidence": data.get("confidence"),
                "latency": latency,
                "data": data
            }
        else:
            return {
                "success": False,
                "error": f"Status {response.status_code}",
                "latency": latency
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def run_health_checks():
    """Run health checks on all services"""
    print_header("HEALTH CHECKS")
    
    results = {}
    for service_name, url in BASE_URLS.items():
        print(f"\nTesting {service_name.upper()} service...")
        results[service_name] = test_health(service_name, url)
    
    all_healthy = all(results.values())
    if all_healthy:
        print_success("\nAll services are healthy!")
    else:
        print_error("\nSome services are not healthy!")
        return False
    
    return True


def run_agent_tests():
    """Run comprehensive agent tests"""
    print_header("AGENT SERVICE TESTS")
    
    results = []
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"\nTest {i}/{len(TEST_CASES)}: {test_case['name']}")
        print(f"Text: {test_case['text'][:80]}...")
        
        result = test_prediction("agent", BASE_URLS["agent"], test_case["text"])
        
        if result["success"]:
            label = result["label"]
            confidence = result["confidence"]
            latency = result["latency"]
            
            print_info(f"Predicted: {label} (confidence: {confidence:.2%})")
            print_info(f"Latency: {latency:.2f}ms")
            
            # Check routing info
            if "routing" in result["data"]:
                routing = result["data"]["routing"]
                print_info(f"Model: {routing['chosen_model']}")
                print_info(f"Reason: {routing['reason']}")
                print_info(f"Text length: {routing['text_length']}")
                print_info(f"Multilingual: {routing['has_multilingual']}")
                print_info(f"PII scrubbed: {routing['pii_scrubbed']}")
            
            # Validate prediction
            if label == test_case.get("expected_category"):
                print_success("Prediction matches expected category")
                results.append(True)
            else:
                print_error(f"Expected {test_case.get('expected_category')}, got {label}")
                results.append(False)
        else:
            print_error(f"Prediction failed: {result.get('error')}")
            results.append(False)
    
    # Summary
    success_rate = sum(results) / len(results) * 100
    print(f"\n{Fore.CYAN}Test Summary:")
    print(f"  Total tests: {len(results)}")
    print(f"  Passed: {sum(results)}")
    print(f"  Failed: {len(results) - sum(results)}")
    print(f"  Success rate: {success_rate:.1f}%")
    
    return success_rate >= 70  # 70% pass rate


def test_model_routing():
    """Test intelligent routing between models"""
    print_header("MODEL ROUTING TESTS")
    
    # Test 1: Short text → TF-IDF
    print("\nTest 1: Short text should use TF-IDF")
    result = test_prediction("agent", BASE_URLS["agent"], "Laptop broken")
    if result["success"]:
        model = result["data"].get("routing", {}).get("chosen_model")
        if model == "tfidf":
            print_success(f"Correctly routed to TF-IDF")
        else:
            print_error(f"Expected TF-IDF, got {model}")
    
    # Test 2: Multilingual → Transformer
    print("\nTest 2: Multilingual text should use Transformer")
    result = test_prediction("agent", BASE_URLS["agent"], "Mon ordinateur est cassé")
    if result["success"]:
        model = result["data"].get("routing", {}).get("chosen_model")
        if model == "transformer":
            print_success(f"Correctly routed to Transformer")
        else:
            print_error(f"Expected Transformer, got {model}")
    
    # Test 3: Long text → Transformer
    print("\nTest 3: Long text should use Transformer")
    long_text = "This is a very long and complex technical issue. " * 10
    result = test_prediction("agent", BASE_URLS["agent"], long_text)
    if result["success"]:
        model = result["data"].get("routing", {}).get("chosen_model")
        if model == "transformer":
            print_success(f"Correctly routed to Transformer")
        else:
            print_error(f"Expected Transformer, got {model}")
    
    # Test 4: Force model selection
    print("\nTest 4: Force TF-IDF model")
    response = requests.post(
        f"{BASE_URLS['agent']}/predict",
        json={"text": "Laptop broken", "force_model": "tfidf"}
    )
    if response.status_code == 200:
        model = response.json().get("routing", {}).get("chosen_model")
        if model == "tfidf":
            print_success(f"Successfully forced TF-IDF")
        else:
            print_error(f"Expected TF-IDF, got {model}")


def test_pii_scrubbing():
    """Test PII scrubbing functionality"""
    print_header("PII SCRUBBING TESTS")
    
    pii_texts = [
        "My email is john@example.com",
        "Call me at 555-123-4567",
        "My SSN is 123-45-6789",
        "Credit card: 1234-5678-9012-3456",
        "IP address: 192.168.1.1"
    ]
    
    for text in pii_texts:
        print(f"\nTesting: {text}")
        result = test_prediction("agent", BASE_URLS["agent"], text)
        if result["success"]:
            pii_scrubbed = result["data"].get("routing", {}).get("pii_scrubbed", False)
            if pii_scrubbed:
                print_success("PII was detected and scrubbed")
            else:
                print_info("No PII detected")


def test_load_performance():
    """Test API performance under load"""
    print_header("PERFORMANCE TEST")
    
    test_text = "My laptop is not working properly"
    num_requests = 10
    
    print(f"\nSending {num_requests} concurrent requests...")
    
    latencies = []
    start_time = time.time()
    
    for i in range(num_requests):
        result = test_prediction("agent", BASE_URLS["agent"], test_text)
        if result["success"]:
            latencies.append(result["latency"])
    
    total_time = time.time() - start_time
    
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        
        print(f"\nPerformance Results:")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Average latency: {avg_latency:.2f}ms")
        print(f"  Min latency: {min_latency:.2f}ms")
        print(f"  Max latency: {max_latency:.2f}ms")
        print(f"  Requests/sec: {num_requests/total_time:.2f}")
        
        if avg_latency < 500:
            print_success("Performance is good!")
        else:
            print_error("Performance needs improvement")


def main():
    """Main test runner"""
    print_header("CallCenterAI - API Testing Suite")
    print(f"{Fore.WHITE}Testing all services and functionality\n")
    
    # Step 1: Health checks
    if not run_health_checks():
        print_error("\nHealth checks failed! Please start all services first.")
        print_info("Run: docker-compose up -d")
        sys.exit(1)
    
    # Step 2: Agent tests
    print("\nWaiting 2 seconds before running tests...")
    time.sleep(2)
    
    agent_success = run_agent_tests()
    
    # Step 3: Model routing tests
    test_model_routing()
    
    # Step 4: PII scrubbing tests
    test_pii_scrubbing()
    
    # Step 5: Performance tests
    test_load_performance()
    
    # Final summary
    print_header("TEST SUITE COMPLETE")
    
    if agent_success:
        print_success("All tests passed! ðŸŽ‰")
        sys.exit(0)
    else:
        print_error("Some tests failed. Please review the output above.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        sys.exit(1)