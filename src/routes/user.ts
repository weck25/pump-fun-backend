// routes/users.ts
import express from 'express';
import User from '../models/User';
import PendingUser from '../models/PendingUser';
import crypto from 'crypto'
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import AdminData from '../models/AdminData';

const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL;

const router = express.Router();

// @route   POST api/users
// @desc    Resgister user
// @access  Public
router.post('/', async (req, res) => {
    const { body } = req;
    const UserSchema = Joi.object().keys({
        name: Joi.string().required(),
        wallet: Joi.string().required(),
        isLedger: Joi.boolean().optional().required(),
        bio: Joi.allow('')
    })
    const inputValidation = UserSchema.validate(body);
    if (inputValidation.error) {
        return res.status(400).json({ error: inputValidation.error.details[0].message })
    }
    const wallet = body.wallet;
    const userData = await User.findOne({ wallet });
    if (!userData == false) {
        const admins = (await AdminData.findOne())?.admin;
        const isAdmin = admins ? admins.includes(userData.wallet) : false;
        const token = jwt.sign({ id: userData._id, name: userData.name, wallet, isAdmin }, 'secret', { algorithm: 'HS256', expiresIn: '60m' });
        return res.status(200).json({ user: { ...userData.toJSON(), admin: isAdmin }, token });
    }

    const exisitingPendingUser = await PendingUser.findOne({ wallet })
    if (exisitingPendingUser == null) {
        const nonce = crypto.randomBytes(8).toString('hex');
        const newPendingUser = new PendingUser({ name: body.name, wallet, nonce, isLedger: body.isLedger });
        const user = await newPendingUser.save();
        const token = jwt.sign({ id: user._id, name: user.name, wallet }, 'secret', { algorithm: 'HS256', expiresIn: '60m' });
        res.status(200).json({ user, token });
    } else {
        res.status(400).json({ message: "A user with this wallet already requested." });
    }
});

// @route   POST api/users/login
// @desc    Resgister user
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { wallet } = req.body;
        const user = await User.findOne({ wallet })
        if (!user) {
            res.status(404).json({ message: 'User not found' });
        } else {
            console.log(user)
            const token = jwt.sign({
                id: user._id,
                name: user.name,
                wallet
            }, 'secret',
                {
                    algorithm: 'HS256',
                    expiresIn: '60m',
                })
            return res.status(200).json({ token });
        }
    } catch (error) {
        res.status(500).json({ error })
    }
})

// @route   POST api/users/:nonce
// @desc    Confirm and Register user
// @access  Public
router.post('/confirm', async (req, res) => {
    console.log("req.body:::", req.body)
    const body = {
        name: req.body.name,
        wallet: req.body.wallet,
        isLedger: req.body.isLedger,
        signature: req.body.signature,
        nonce: req.body.nonce,
    }
    // Validate form
    const UserSchema = Joi.object().keys({
        name: Joi.string().required(),
        wallet: Joi.string().required(),
        nonce: Joi.string().required(),
        signature: Joi.string().required(),
        isLedger: Joi.boolean().optional().required(),
    })
    const inputValidation = UserSchema.validate(body);
    if (inputValidation.error) {
        return res.status(400).json({ error: inputValidation.error.details[0].message })
    }
    // const foundUser = await User.findOne({wallet : body.wallet})
    // if(!foundUser == null ) return res.status(400).json("First of all, You have to register User")
    const foundNonce = await PendingUser.findOneAndDelete({ nonce: body.nonce }).exec();
    if (foundNonce == null) return res.status(400).json("Your request expired")

    // nonce  decode!!
    // if (!body.isLedger) {
    //     const signatureUint8 = base58.decode(body.signature);
    //     const msgUint8 = new TextEncoder().encode(`${body.nonce}`);
    //     const pubKeyUint8 = base58.decode(body.wallet);

    //     const isValidSignature = nacl.sign.detached.verify(msgUint8, signatureUint8, pubKeyUint8);
    //     // const isValidSignature = true;
    //     if (!isValidSignature) return res.status(404).json({ error: "Invalid signature" })
    // } else {
    //     const ledgerSerializedTx = JSON.parse(body.signature);
    //     const signedTx = Transaction.from(Uint8Array.from(ledgerSerializedTx));

    //     const feePayer = signedTx.feePayer?.toBase58() || "";

    //     if (feePayer != body.wallet) {
    //         return res.status(400).json({ error: "Invalid wallet or fee payer" });
    //     }

    //     const MEMO_PROGRAM_ID = new PublicKey(
    //         "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
    //     );

    //     const inx = signedTx.instructions.find(
    //         (ix) => ix.programId.toBase58() == MEMO_PROGRAM_ID.toBase58()
    //     );

    //     if (!inx) {
    //         return res
    //             .status(503)
    //             .json({ error: "Memo program couldn't be verified" });
    //     }

    //     if (!signedTx.verifySignatures()) {
    //         return res
    //             .status(503)
    //             .json({ error: "Could not verify signatures" });
    //     }
    // }
    const userData = {
        name: body.name,
        wallet: body.wallet
    }
    const newUser = new User(userData);
    await newUser.save().then((user: UserInfo) => res.status(200).send(user))

});

// GET: Fetch user
router.get('/', async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

// GET: Fetch all users
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    try {
        const user = await User.findOne({ _id: id });
        res.status(200).send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.post('/update/:id', async (req, res) => {
    try {
        const { username, bio, url } = req.body;
        const urlSeg = url.split('/');
        const _url = `${PINATA_GATEWAY_URL}/${urlSeg[urlSeg.length - 1]}`;
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(id, { name: username, bio, avatar: _url }, { new: true });
        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).json('Server Error');
    }
})



export default router;

export interface UserInfo {
    name: string,
    wallet: string,
    avatar?: string,
}

export interface PendingUserInfo {
    name: string,
    wallet: string,
    nonce: string,
}