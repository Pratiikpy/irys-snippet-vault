import requests
import json
import sys
import uuid
from datetime import datetime

class IrysSnippetVaultTester:
    def __init__(self, base_url="http://0.0.0.0:8001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_wallet_address = f"0x{uuid.uuid4().hex[:40]}"  # Generate a random wallet address for testing
        self.saved_snippet_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        return success, response.json()
                    except:
                        return success, response.content
                return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        print(f"Response: {response.json()}")
                    except:
                        print(f"Response: {response.content}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_extract_snippet(self, url="https://example.com"):
        """Test the extract-snippet endpoint"""
        return self.run_test(
            "Extract Snippet",
            "POST",
            "extract-snippet",
            200,
            data={"url": url}
        )

    def test_summarize(self, snippet, url, title):
        """Test the summarize endpoint"""
        return self.run_test(
            "Summarize Snippet",
            "POST",
            "summarize",
            200,
            data={
                "snippet": snippet,
                "url": url,
                "title": title
            }
        )

    def test_save_snippet_metadata(self, url, title, summary, tags, network="devnet"):
        """Test saving snippet metadata"""
        return self.run_test(
            "Save Snippet Metadata",
            "POST",
            "save-snippet-metadata",
            200,
            data={
                "wallet_address": self.test_wallet_address,
                "irys_id": f"test-irys-id-{uuid.uuid4()}",
                "url": url,
                "title": title,
                "summary": summary,
                "tags": tags,
                "network": network
            }
        )

    def test_get_user_snippets(self):
        """Test getting user snippets"""
        return self.run_test(
            "Get User Snippets",
            "GET",
            f"snippets/{self.test_wallet_address}",
            200
        )

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Irys Snippet Vault API Tests")
        
        # Test root endpoint
        self.test_root_endpoint()
        
        # Test extract snippet
        success, extract_data = self.test_extract_snippet()
        if not success or not extract_data:
            print("❌ Extract snippet test failed, cannot continue with dependent tests")
            return
        
        # Test summarize
        success, summarize_data = self.test_summarize(
            extract_data.get("snippet", "Example snippet text for testing"),
            extract_data.get("url", "https://example.com"),
            extract_data.get("title", "Example Title")
        )
        if not success or not summarize_data:
            print("❌ Summarize test failed, cannot continue with dependent tests")
            return
        
        # Test save snippet metadata
        success, metadata = self.test_save_snippet_metadata(
            extract_data.get("url", "https://example.com"),
            extract_data.get("title", "Example Title"),
            summarize_data.get("summary", "Example summary"),
            summarize_data.get("tags", ["tag1", "tag2", "tag3"])
        )
        if not success:
            print("❌ Save snippet metadata test failed")
        
        # Test get user snippets
        success, snippets_data = self.test_get_user_snippets()
        if success:
            # Verify the saved snippet is in the returned data
            if snippets_data and "snippets" in snippets_data:
                if len(snippets_data["snippets"]) > 0:
                    print(f"✅ Found {len(snippets_data['snippets'])} snippets for the test wallet")
                else:
                    print("⚠️ No snippets found for the test wallet")
        
        # Print summary
        print(f"\n📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        return self.tests_passed == self.tests_run

def main():
    tester = IrysSnippetVaultTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())