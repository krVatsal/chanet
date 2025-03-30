import mongoose from "mongoose";
const {Schema, model} = mongoose;

const datasetSchema = new Schema({
    title: String,
    url: String,
    subtitle: String,
    creatorName: String,
    downloadCount: Number
});

const messageSchema = new Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    trainingData: Schema.Types.Mixed
});

const chatSessionSchema = new Schema({
    sessionId: {
        type: String,
        required: true,
        default: () => Date.now().toString()
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [messageSchema],
    datasets: [datasetSchema],
    lastActive: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const historySchema = new Schema({
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    sessions: [chatSessionSchema]
});

const History = model('History', historySchema);

export default History;