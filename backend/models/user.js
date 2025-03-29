import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    email: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const User = model('User', userSchema);

export default User;
