const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://shamamaaslam377_db_user:WFStore2025@cluster0.dj9lvvl.mongodb.net/Wajahat_Fabrics?retryWrites=true&w=majority';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connection successful!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err);
    process.exit(1);
  });
