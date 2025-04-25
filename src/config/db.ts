import mongoose from 'mongoose';

const connectDb = async (): Promise<void> => {

    const uri = 'mongodb://localhost:27017/hashqubes-mallu-store';
    // const uri='mongodb://127.0.0.1:27017/MalluStore'
    // const uri = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.2.9';

  try {
    const connection = await mongoose.connect(uri);
    console.log(`🟢 Mongo db connected:`, connection.connection.host);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default connectDb;
