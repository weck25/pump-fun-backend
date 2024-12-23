"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Follower.ts
const mongoose_1 = __importDefault(require("mongoose"));
const followerSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    followers: [{
            follower: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
        }]
});
const Follower = mongoose_1.default.model('Follower', followerSchema);
exports.default = Follower;
