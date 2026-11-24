export const schema = `
CREATE TABLE users (
  id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','RECEPTIONIST','MECHANIC'))
);
CREATE TABLE sessions (
  tokenHash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expiresAt TEXT NOT NULL
);
CREATE TABLE clients (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE TABLE vehicles (
  id TEXT PRIMARY KEY, clientId TEXT NOT NULL REFERENCES clients(id), plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL, model TEXT NOT NULL, createdAt TEXT NOT NULL
);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, vehicleId TEXT NOT NULL REFERENCES vehicles(id), mechanicId TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RECEIVED','DIAGNOSING','AWAITING_AUTHORIZATION','AUTHORIZED','REJECTED','IN_REPAIR','BLOCKED','COMPLETED')),
  createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE INDEX orders_vehicle_date ON orders(vehicleId, createdAt DESC);
CREATE UNIQUE INDEX one_open_order_per_vehicle ON orders(vehicleId) WHERE status NOT IN ('COMPLETED','REJECTED');
CREATE TABLE diagnoses (
  orderId TEXT PRIMARY KEY REFERENCES orders(id), findings TEXT NOT NULL, recommendedWork TEXT NOT NULL,
  complete INTEGER NOT NULL CHECK(complete IN (0,1)), recordedBy TEXT NOT NULL REFERENCES users(id), updatedAt TEXT NOT NULL
);
CREATE TABLE authorizations (
  orderId TEXT PRIMARY KEY REFERENCES orders(id), decision TEXT NOT NULL CHECK(decision IN ('APPROVED','REJECTED')),
  evidence TEXT NOT NULL, recordedBy TEXT NOT NULL REFERENCES users(id), createdAt TEXT NOT NULL
);
CREATE TABLE repairs (
  id TEXT PRIMARY KEY, orderId TEXT NOT NULL REFERENCES orders(id), activity TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('PROGRESS','BLOCKED','COMPLETED')),
  recordedBy TEXT NOT NULL REFERENCES users(id), createdAt TEXT NOT NULL
);
CREATE INDEX repairs_order ON repairs(orderId, createdAt);
PRAGMA user_version = 1;
`;
