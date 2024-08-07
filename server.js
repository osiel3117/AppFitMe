const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');

const app = express();
const upload = multer({ dest: '/www/uploads/' });
const port = 5000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('www'));

app.use('/www/uploads', express.static(path.join(__dirname, 'uploads')));


mongoose.connect('mongodb+srv://osiel:Lilbean31_@cluster0.5rxflnj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fitnessLevel: String,
    createdAt: { type: Date, default: Date.now },
    streak: { type: Number, default: 0 },
    lastCompleted: Date
});

const userHealthSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    age: Number,
    gender: String,
    weight: Number,
    height: Number,
    recordedAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});


const reminderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reminderText: String,
    reminderDate: { type: Date, required: true },
    reminderTime: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const exerciseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    gif_url: String,
    routine_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Routine', required: true },
    repetitions: { type: Number, required: true }
});

const routineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
    bodyPart: { type: String, required: true },
    description: String
});


const commentSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const likeSchema = new mongoose.Schema({
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const UserHealth = mongoose.model('UserHealth', userHealthSchema);
const Post = mongoose.model('Post', postSchema);
const Reminder = mongoose.model('Reminder', reminderSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Routine = mongoose.model('Routine', routineSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Like = mongoose.model('Like', likeSchema);

app.post('/api/complete-routine', async (req, res) => {
    const { userId } = req.body;
    try {
      let user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      const currentDate = new Date();
      const lastCompleted = user.lastCompleted ? new Date(user.lastCompleted) : null;
      const isSameDay = lastCompleted &&
        lastCompleted.getDate() === currentDate.getDate() &&
        lastCompleted.getMonth() === currentDate.getMonth() &&
        lastCompleted.getFullYear() === currentDate.getFullYear();
  
      if (!isSameDay) {
        user.streak += 1;
        user.lastCompleted = currentDate;
      }
  
      await user.save();
      res.json({ success: true, streak: user.streak });
    } catch (error) {
      console.error('Error updating user streak:', error);
      res.status(500).json({ error: 'Failed to update user streak' });
    }
});
  

app.post('/api/update-streak', async (req, res) => {
    const { userId } = req.body;

    try {
        let user = await User.findById(userId);

        if (!user) {
            const newUser = new User({
                userId: userId,
                streak: 1,
                lastCompleted: new Date()
            });

            await newUser.save();
            return res.json({ success: true, streak: newUser.streak });
        } else {
            const lastCompleted = new Date(user.lastCompleted);
            const today = new Date();
            const differenceInTime = today.getTime() - lastCompleted.getTime();
            const differenceInDays = differenceInTime / (1000 * 3600 * 24);

            if (differenceInDays <= 1) {
                user.streak += 1;
            } else {
                user.streak = 1;
            }

            user.lastCompleted = new Date();
            await user.save();
            return res.json({ success: true, streak: user.streak });
        }
    } catch (err) {
        console.error('Error updating user streak:', err);
        return res.status(500).json({ success: false, message: 'Error updating user streak' });
    }
});

app.get('/api/user-profile-dash', async (req, res) => {
    const { userId } = req.query;

    try {
        const mongoUser = await User.findById(userId);

        if (!mongoUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ streak: mongoUser.streak });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

app.post('/api/register', async (req, res) => {
    const { username, email, password, fitnessLevel, age, gender, weight, height } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const newUser = new User({ username, email, password: hashedPassword, fitnessLevel });
        const savedUser = await newUser.save();

        const newUserHealth = new UserHealth({
            userId: savedUser._id,
            age,
            gender,
            weight,
            height
        });

        await newUserHealth.save();

        res.json({ success: true, userId: savedUser._id });
    } catch (error) {
        console.error('Error registering user:', error);
        res.json({ success: false, message: 'Error registering user' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            res.json({ success: true, userId: user._id });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Error logging in user' });
    }
});

app.get('/api/user-health', async (req, res) => {
    const userId = req.query.userId;

    try {
        const healthData = await UserHealth.findOne({ userId }).sort({ recordedAt: -1 });

        if (!healthData) {
            return res.status(404).json({ error: 'No health data found for user' });
        }

        res.json(healthData);
    } catch (error) {
        console.error('Error fetching user health data:', error);
        res.status(500).json({ error: 'Error fetching user health data' });
    }
});

app.post('/api/update-health', async (req, res) => {
    const { userId, age, gender, weight, height } = req.body;

    try {
        const updatedHealthData = await UserHealth.findOneAndUpdate(
            { userId },
            { age, gender, weight, height, recordedAt: new Date() },
            { new: true, upsert: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user health data:', error);
        res.status(500).json({ error: 'Error updating user health data' });
    }
});

app.get('/api/user-reminders', async (req, res) => {
    const userId = req.query.userId;

    try {
        const reminders = await Reminder.find({ userId })
            .sort({ reminderDate: 1, reminderTime: 1 })
            .limit(2);
        res.json(reminders);
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});



app.get('/api/reminders', async (req, res) => {
    const userId = req.query.userId;

    try {
        const reminders = await Reminder.find({ userId }).sort({ reminderDate: 1, reminderTime: 1 });
        res.json(reminders);
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});

app.get('/api/reminders-count', async (req, res) => {
    const userId = req.query.userId;

    try {
        const count = await Reminder.countDocuments({ userId });
        res.json({ count });
    } catch (error) {
        console.error('Error fetching reminders count:', error);
        res.status(500).json({ error: 'Failed to fetch reminders count' });
    }
});

app.post('/api/reminders', async (req, res) => {
    const { userId, reminderText, reminderDate, reminderTime } = req.body;

    try {
        const newReminder = new Reminder({
            userId,
            reminderText,
            reminderDate: new Date(reminderDate),
            reminderTime
        });
        await newReminder.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ error: 'Failed to create reminder' });
    }
});

app.delete('/api/reminders/:id', async (req, res) => {
    const reminderId = req.params.id;

    try {
        await Reminder.findByIdAndDelete(reminderId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});

app.get('/api/user-profile', async (req, res) => {
    const userId = req.query.userId;

    try {
        const user = await User.findById(userId).select('username email fitnessLevel');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Error fetching user profile' });
    }
});

app.post('/api/update-profile', async (req, res) => {
    const { userId, username, email, fitnessLevel } = req.body;

    try {
        const updatedUser = await User.findByIdAndUpdate(userId, { username, email, fitnessLevel }, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Error updating user profile' });
    }
});

app.post('/api/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ error: 'Error changing password' });
    }
});

app.get('/api/user-routines', async (req, res) => {
    const userId = req.query.userId;

    try {
        const routines = await Routine.find({ userId }).select('name description');

        if (!routines) {
            return res.status(404).json({ error: 'No routines found for user' });
        }

        res.json(routines);
    } catch (error) {
        console.error('Error fetching user routines:', error);
        res.status(500).json({ error: 'Error fetching user routines' });
    }
});

app.get('/api/routine/:id/exercises', async (req, res) => {
    const routineId = req.params.id;
    try {
        const exercises = await Exercise.find({ routine_id: routineId });
        res.json(exercises);
    } catch (error) {
        console.error('Error fetching exercises:', error);
        res.status(500).json({ error: 'Failed to fetch exercises' });
    }
});
  


app.get('/api/routines/details', async (req, res) => {
    const { name } = req.query;

    try {
        const routine = await Routine.findOne({ name });

        if (!routine) {
            return res.status(404).json({ error: 'Routine not found' });
        }

        const routineExercises = await RoutineExercise.find({ routineId: routine._id }).populate('exerciseId');

        const formattedExercises = routineExercises.map(re => ({
            name: re.exerciseId.name,
            description: re.exerciseId.description,
            gifUrl: re.exerciseId.gifUrl,
            repetitions: re.repetitions
        }));

        res.json({ ...routine.toObject(), exercises: formattedExercises });
    } catch (error) {
        console.error('Error fetching routine details:', error);
        res.status(500).json({ error: 'Failed to fetch routine details' });
    }
});


app.get('/api/30-day-plan', async (req, res) => {
    try {
        const routines = await Routine.find();
        const exercises = await Exercise.find();

        const exercisesByRoutine = exercises.reduce((acc, exercise) => {
            const routineId = exercise.routine_id.toString();
            if (!acc[routineId]) {
                acc[routineId] = [];
            }
            acc[routineId].push({
                name: exercise.name,
                description: exercise.description,
                gif_url: exercise.gif_url,
                repetitions: exercise.repetitions
            });
            return acc;
        }, {});

        const routinesWithExercises = routines.map(routine => ({
            ...routine.toObject(),
            exercises: exercisesByRoutine[routine._id.toString()] || []
        }));

        const plan = generate30DayPlan(routinesWithExercises);
        res.json(plan);
    } catch (error) {
        console.error('Error fetching 30-day plan:', error);
        res.status(500).json({ error: 'Failed to fetch 30-day plan' });
    }
});

function generate30DayPlan(routines) {
    const plan = [];
    const days = 30;
    const routinesPerDay = Math.ceil(routines.length / days);

    for (let i = 0; i < days; i++) {
        plan.push([]);
        for (let j = 0; j < routinesPerDay; j++) {
            const routine = routines[(i * routinesPerDay + j) % routines.length];
            if (routine) {
                plan[i].push(routine);
            }
        }
    }

    return plan;
}



app.get('/api/community', async (req, res) => {
    try {
        const posts = await Post.find().populate('userId', 'username').sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
});


app.post('/api/community', async (req, res) => {
    const { userId, content } = req.body;

    try {
        const newPost = new Post({ userId, content });
        await newPost.save();

        const populatedPost = await Post.findById(newPost._id).populate('userId', 'username');

        res.json({ success: true, post: populatedPost });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.post('/api/delete-post', async (req, res) => {
    const { postId, userId } = req.body;

    try {
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await post.deleteOne();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});



app.post('/api/like', async (req, res) => {
    const { userId, postId } = req.body;
    try {
        const like = new Like({ userId, postId });
        await like.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Error liking post' });
    }
});

app.post('/api/unlike', async (req, res) => {
    const { userId, postId } = req.body;
    try {
        await Like.findOneAndDelete({ userId, postId });
        res.json({ success: true });
    } catch (error) {
        console.error('Error unliking post:', error);
        res.status(500).json({ error: 'Error unliking post' });
    }
});

// Ruta para obtener comentarios de un post específico
app.get('/api/comments', async (req, res) => {
    const { postId } = req.query;

    try {
        const comments = await Comment.find({ postId }).populate('userId', 'username');
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Ruta para crear un nuevo comentario
app.post('/api/community/comment', async (req, res) => {
    const { userId, postId, content } = req.body;

    try {
        const newComment = new Comment({ userId, postId, content });
        await newComment.save();

        const populatedComment = await newComment.populate('userId', 'username');

        res.json({ success: true, comment: populatedComment });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});



app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
