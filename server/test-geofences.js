/**
 * Test script for geofence API
 * Run with: cd server
 * node test-geofences.js
 */

const http = require('http');

const API_URL = 'http://localhost:3001';

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Geofence API\n');
  console.log('='.repeat(50));

  // Test 1: Health check
  console.log('\n1️⃣ Testing server health...');
  try {
    const { status, data } = await makeRequest('/health');
    if (status === 200) {
      console.log('✅ Server is running');
      console.log(`   Timestamp: ${data.timestamp}`);
    } else {
      console.log('❌ Server health check failed');
      return;
    }
  } catch (err) {
    console.log('❌ Cannot connect to server');
    console.log(`   Make sure server is running on ${API_URL}`);
    return;
  }

  // Test 2: Database connection
  console.log('\n2️⃣ Testing database connection...');
  try {
    const { status, data } = await makeRequest('/api/test-db');
    if (status === 200 && data.success) {
      console.log('✅ Database connected');
      console.log(`   Time: ${data.time.now}`);
    } else {
      console.log('❌ Database connection failed');
      console.log(`   Error: ${data.error}`);
      return;
    }
  } catch (err) {
    console.log('❌ Database test failed:', err.message);
    return;
  }

  // Test 3: Get all geofences
  console.log('\n3️⃣ Testing GET /api/geofences...');
  try {
    const { status, data } = await makeRequest('/api/geofences');
    if (status === 200) {
      console.log('✅ Geofences fetched successfully');
      console.log(`   Type: ${data.type}`);
      console.log(`   Features: ${data.features?.length || 0}`);

      if (data.features && data.features.length > 0) {
        console.log('\n   Geofences:');
        data.features.forEach((feature, i) => {
          console.log(`   ${i + 1}. ${feature.properties.name}`);
          console.log(`      Type: ${feature.properties.geofence_type}`);
          console.log(`      Created: ${new Date(feature.properties.created_at).toLocaleString()}`);
        });
      } else {
        console.log('   ⚠️  No geofences found. Run geofencing-setup.sql to add sample data.');
      }
    } else {
      console.log('❌ Failed to fetch geofences');
      console.log(`   Status: ${status}`);
      console.log(`   Error: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log('❌ Geofence fetch failed:', err.message);
  }

  // Test 4: Create a test geofence
  console.log('\n4️⃣ Testing POST /api/geofences...');
  const testGeofence = {
    name: 'Test Zone (Auto-created)',
    description: 'Created by test script',
    geofence_type: 'zone',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-85.310, 35.040],
        [-85.310, 35.042],
        [-85.308, 35.042],
        [-85.308, 35.040],
        [-85.310, 35.040]
      ]]
    },
    metadata: {
      test: true,
      created_by: 'test_script'
    }
  };

  try {
    const { status, data } = await makeRequest('/api/geofences', 'POST', testGeofence);
    if (status === 201) {
      console.log('✅ Geofence created successfully');
      console.log(`   ID: ${data.id}`);
      console.log(`   Name: ${data.properties.name}`);

      // Clean up - delete the test geofence
      console.log('\n5️⃣ Cleaning up test geofence...');
      const deleteResult = await makeRequest(`/api/geofences/${data.id}`, 'DELETE');
      if (deleteResult.status === 200) {
        console.log('✅ Test geofence deleted');
      }
    } else {
      console.log('❌ Failed to create geofence');
      console.log(`   Status: ${status}`);
      console.log(`   Error: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log('❌ Geofence creation failed:', err.message);
  }

  // Test 5: Check point in geofence
  console.log('\n6️⃣ Testing POST /api/geofences/check-point...');
  const testPoint = {
    longitude: -85.3091,
    latitude: 35.0456
  };

  try {
    const { status, data } = await makeRequest('/api/geofences/check-point', 'POST', testPoint);
    if (status === 200) {
      console.log('✅ Point check successful');
      console.log(`   Point: ${data.point.latitude}, ${data.point.longitude}`);
      console.log(`   Found in ${data.geofences?.length || 0} geofence(s)`);

      if (data.geofences && data.geofences.length > 0) {
        data.geofences.forEach((gf, i) => {
          console.log(`   ${i + 1}. ${gf.geofence_name} (${gf.geofence_type})`);
        });
      }
    } else {
      console.log('❌ Point check failed');
      console.log(`   Status: ${status}`);
    }
  } catch (err) {
    console.log('❌ Point check failed:', err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ API tests completed!');
  console.log('\nNext steps:');
  console.log('1. Start the frontend: cd client && npm start');
  console.log('2. Navigate to: http://localhost:3000/geofencing');
  console.log('3. Draw polygons on the map to create geofences');
  console.log('\n📚 See GEOFENCING_STARTUP.md for detailed instructions');
}

// Run tests
console.log('Starting geofence API tests...');
console.log(`API URL: ${API_URL}\n`);

runTests().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
