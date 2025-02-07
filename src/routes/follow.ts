import express from "express";
import Follower from "../models/Follower";
import User from "../models/User";

const router = express.Router();

const changeNumberOfFollower = async (num: number, userId: string) => {
    try {
        await User.findByIdAndUpdate(userId, { $inc: { follower: num } }, { new: true });
    } catch (error) {
        console.error(`Error updating follower count for user ${userId}:`, error);
    }
};

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const followers = await Follower.findOne({ userId }).populate('followers.follower');
        return res.status(200).json(followers || { followers: [] });
    } catch (error) {
        console.error('Error fetching followers:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/:userId', async (req, res) => {
    const { userId } = req.params;
    const { followerId } = req.body;

    try {
        let followers = await Follower.findOne({ userId });
        if (followers) {
            const alreadyFollowing = followers.followers.some(f => f.follower.toString() === followerId);
            if (alreadyFollowing) {
                return res.status(400).json({ error: 'Already following this user' });
            }

            followers.followers.push({ follower: followerId });
        } else {
            followers = new Follower({
                userId,
                followers: [{ follower: followerId }],
            });
        }

        const savedFollowers = await followers.save();
        await savedFollowers.populate('followers.follower');
        await changeNumberOfFollower(1, userId);
        return res.status(200).json(savedFollowers);
    } catch (error) {
        console.error('Error following user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/unfollow/:userId', async (req, res) => {
    const { userId } = req.params;
    const { followerId } = req.body;

    try {
        const followers = await Follower.findOne({ userId });
        if (!followers) {
            return res.status(404).json({ error: 'Followers not found' });
        }

        // Use Mongoose's DocumentArray methods to remove the follower
        const followerIndex = followers.followers.findIndex(
            f => f.follower.toString() === followerId
        );

        if (followerIndex === -1) {
            return res.status(400).json({ error: 'Follower not found' });
        }

        followers.followers.splice(followerIndex, 1); // Remove follower
        const savedFollowers = await followers.save();
        await savedFollowers.populate('followers.follower');
        await changeNumberOfFollower(-1, userId);

        return res.status(200).json(savedFollowers);
    } catch (error) {
        console.error('Error unfollowing user:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/following/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const followingData = await Follower.find({ 'followers.follower': userId }).populate('userId');

        const following = followingData.map(entry => entry.userId);
        return res.status(200).json(following);
    } catch (error) {
        console.error('Error fetching following users:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
