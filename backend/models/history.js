import mongoose from "mongoose";
const {Schema, model} = mongoose;

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
    }
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
    trainingData: [{
        type: String
    }],
    datasets: [{
        type: Object
    }]
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