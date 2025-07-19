import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { login, getPosts, getCurrentUser } from '../../services';
import { testConnection } from '../../utils/api';

export default function ApiTestScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState({});
  const { themeColors } = useTheme();

  const runApiTests = async () => {
    setLoading(true);
    setError(null);
    const results = {};
    
    try {
      // Test 1: Check API connection
      results.connection = 'Checking connection...';
      setTestResults({...results});
      
      // First test the basic connection
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        throw new Error(`Cannot connect to backend: ${connectionTest.error}\n${connectionTest.suggestion}`);
      }
      results.connection = '✅ Connected successfully!';
      setTestResults({...results});
      
      // First, try to access the auth endpoint to check connection
      // This endpoint supports OPTIONS for CORS preflight
      try {
        const response = await fetch('http://localhost:8082/api/auth/signup', {
          method: 'OPTIONS', // Use OPTIONS to test CORS preflight
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok || response.status === 200) {
          results.connection = '✅ Backend is reachable';
          results.corsStatus = '✅ CORS is properly configured';
        } else {
          results.connection = `⚠️ Backend responded with status: ${response.status}`;
        }
      } catch (connErr) {
        results.connection = '❌ Backend connection failed';
        results.error = `Cannot connect to backend: ${connErr.message}`;
        results.suggestion = 'Make sure your backend is running and accessible from this device/emulator. Check console for more details.';
        console.error('Connection error details:', connErr);
        setTestResults({...results});
        throw new Error(`Cannot connect to backend: ${connErr.message}`);
      }
      setTestResults({...results});
      
      // Test 2: Login with test user
      results.login = 'Attempting login...';
      setTestResults({...results});
      
      // Create a unique test user with timestamp
      const timestamp = Date.now();
      const testUsername = `testuser_${timestamp}`;
      const testEmail = `testuser_${timestamp}@example.com`;
      const testPassword = 'Test@123';
      
      try {
        // First register the new test user
        const registerResponse = await fetch('http://localhost:8082/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: testUsername,
            email: testEmail,
            password: testPassword
          })
        });

        if (!registerResponse.ok) {
          const error = await registerResponse.json();
          throw new Error(`Registration failed: ${error.message || 'Unknown error'}`);
        }

        // Now login with the new user using username instead of email
        const loginResponse = await fetch('http://localhost:8082/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: testUsername,  // Using username instead of email
            password: testPassword
          })
        });

        if (!loginResponse.ok) {
          const error = await loginResponse.json();
          throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
        }

        const loginData = await loginResponse.json();
        results.login = `✅ Login successful!`;
        results.user = `👤 Username: ${loginData.username || 'Unknown'}`;
        results.token = `🔑 Token: ${loginData.token ? 'Received' : 'Missing'}`;
      } catch (loginErr) {
        results.login = `❌ Login failed: ${loginErr.response?.data?.message || loginErr.message}`;
        setTestResults({...results});
        throw new Error(`Login failed: ${loginErr.response?.data?.message || loginErr.message}`);
      }
      setTestResults({...results});
      
      // Test 3: Get Current User (Skipped - Endpoint not implemented)
      results.currentUser = '⏭️ Skipping user profile fetch (endpoint not implemented)';
      setTestResults({...results});
      
      // Test 4: Get Posts (Skipped - Endpoint not implemented)
      results.getPosts = '⏭️ Skipping posts fetch (endpoint not implemented)';
      setTestResults({...results});
      
      // Add a note about successful authentication
      results.note = '✅ Authentication flow is working correctly!';
      results.note2 = 'Note: Some endpoints are not implemented yet.';
      setTestResults({...results});
      
    } catch (err) {
      console.error('API Test Error:', err);
      setError(err.message || 'An error occurred during testing');
      setTestResults({
        ...results,
        error: `❌ ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>API Integration Test</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Run API Tests" 
          onPress={runApiTests} 
          disabled={loading}
          color={themeColors.accent}
        />
      </View>
      
      {loading && <ActivityIndicator size="large" color={themeColors.accent} style={styles.loader} />}
      
      <View style={styles.resultsContainer}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Test Results:</Text>
        {Object.entries(testResults).map(([test, result]) => (
          <View key={test} style={styles.testRow}>
            <Text style={[styles.testName, { color: themeColors.text }]}>{test}:</Text>
            <Text style={[
              styles.testResult, 
              { color: result.includes('✅') ? 'green' : result.includes('❌') ? 'red' : themeColors.text }
            ]}>
              {result}
            </Text>
          </View>
        ))}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  loader: {
    marginVertical: 20,
  },
  resultsContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingVertical: 5,
  },
  testName: {
    flex: 1,
    fontWeight: '500',
  },
  testResult: {
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
  },
});
