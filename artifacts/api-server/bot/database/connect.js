import mongoose from 'mongoose';

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI non définie dans les variables d\'environnement');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    console.log('✅ MongoDB connecté avec succès');
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err.message);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB déconnecté — tentative de reconnexion...');
  isConnected = false;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erreur MongoDB:', err.message);
});

export default connectDB;
