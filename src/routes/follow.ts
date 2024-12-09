import express from "express";
import Follower from "../models/Follower";

const router = express.Router();

router.get('/:userId', async (req, res) => {
    const userId: string = req.params.userId;
    const followers = await Follower.findOne({ userId }).populate('followers.follower');
    return res.status(200).json(followers)
});

router.post('/:userId', async (req, res) => {
    const userId: string = req.params.userId;
    const { followerId } = req.body;
    const followers = await Follower.findOne({ userId });
    if (followers) {
        followers?.followers.push(followerId);
        followers.save();
        await followers.populate('followers.follower');
        return res.status(200).json(followers);
    } else {
        const newFollowers = new Follower({
            userId,
            followers: [{ follower: followerId }]
        });
        await newFollowers.save();
        return res.status(200).json(newFollowers)
    }
})

router.post('/unfollow/:userId', async (req, res) => {
    const userId: string = req.params.userId;
    const { followerId } = req.body;

    try {
        const followers = await Follower.findOne({ userId });
        if (followers) {
            const updatedFollowers = followers.followers
                .map(follower => follower.toObject())
                .filter(follower => follower.follower.toString() !== followerId);

            followers.followers = updatedFollowers as any;

            await followers.save();
            await followers.populate('followers.follower');
        }

        return res.status(200).json(followers);
    } catch (error) {
        console.error('Error unfollowing user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


export default router;