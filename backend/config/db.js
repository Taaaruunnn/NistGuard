const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Optional DNS resolver override, opt-in via DNS_SERVERS.
 *
 * `mongodb+srv://` requires an SRV lookup, and some ISP/corporate resolvers
 * refuse SRV queries outright (you see `querySrv ECONNREFUSED`). Hosting
 * platforms never hit this, so this exists purely so local development works
 * behind such a resolver. Leave DNS_SERVERS unset everywhere else.
 */
let dnsConfigured = false;
const applyDnsOverride = () => {
  if (dnsConfigured || !process.env.DNS_SERVERS) return;
  const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) {
    dns.setServers(servers);
    console.log(`DNS resolver overridden for SRV lookups: ${servers.join(', ')}`);
  }
  dnsConfigured = true;
};

/**
 * Serverless-safe connection helper.
 *
 * On Vercel each invocation may reuse a warm Lambda container, so we cache the
 * connection promise on the module (and on globalThis, which survives HMR and
 * repeated requires) instead of dialing Atlas on every request. Dialing per
 * request is what usually produces "connection pool exhausted" on free tiers.
 */
let cached = globalThis.__nistguardMongo;
if (!cached) {
  cached = globalThis.__nistguardMongo = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  applyDnsOverride();

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy backend/.env.example to backend/.env (or set it in the Vercel project settings).');
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(uri, {
        // Fail fast rather than hanging the whole serverless invocation when
        // Atlas Network Access has not been opened up to the platform's IPs.
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}/${m.connection.name}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null; // allow a later request to retry
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
