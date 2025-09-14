// MongoDB initialization script for Crowe-Lang

print('🚀 Initializing Crowe-Lang MongoDB database...');

// Switch to the crowelang database
db = db.getSiblingDB('crowelang');

// Create collections with validators
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "createdAt"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        },
        name: {
          bsonType: "string"
        },
        stripeCustomerId: {
          bsonType: "string"
        },
        plan: {
          enum: ["free", "personal", "professional", "team", "enterprise"]
        },
        createdAt: {
          bsonType: "date"
        }
      }
    }
  }
});

db.createCollection('licenses', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["licenseKey", "userId", "plan", "issuedAt"],
      properties: {
        licenseKey: {
          bsonType: "string",
          pattern: "^CL[0-9][PRTEF]-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{4}$"
        },
        userId: {
          bsonType: "objectId"
        },
        plan: {
          enum: ["personal", "professional", "team", "enterprise"]
        },
        status: {
          enum: ["active", "suspended", "expired", "cancelled"]
        },
        issuedAt: {
          bsonType: "date"
        },
        expiresAt: {
          bsonType: "date"
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "stripeCustomerId": 1 });
db.licenses.createIndex({ "licenseKey": 1 }, { unique: true });
db.licenses.createIndex({ "userId": 1 });
db.licenses.createIndex({ "status": 1 });
db.licenses.createIndex({ "expiresAt": 1 });

// Insert sample data for testing
const sampleUser = {
  name: "Michael Benjamin Crowe",
  email: "michael@crowelogic.com",
  plan: "enterprise",
  stripeCustomerId: "cus_test_sample",
  createdAt: new Date(),
  updatedAt: new Date()
};

const userId = db.users.insertOne(sampleUser).insertedId;

const sampleLicense = {
  licenseKey: "CL1E-12345678-ABCDEFGH-IJKLMNOP-QRST",
  userId: userId,
  plan: "enterprise",
  status: "active",
  issuedAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  usage: {
    compilations: 0,
    apiCalls: 0
  },
  hardwareFingerprints: [],
  metadata: {
    version: "1.0.0",
    issued_by: "system"
  }
};

db.licenses.insertOne(sampleLicense);

print('✅ Database initialized successfully');
print('📊 Collections created: users, licenses');
print('🔍 Indexes created for optimal performance');
print('📝 Sample data inserted for testing');
print('🎉 Crowe-Lang database ready!');