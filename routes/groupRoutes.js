const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const upload = require('../middleware/upload');
const groupController = require('../controllers/groupController');

router.post('/', protect, upload.single('avatar'), groupController.createGroup);
router.get('/', protect, groupController.getGroups);
router.get('/:id', protect, groupController.getGroupById);
router.put('/:id', protect, upload.single('avatar'), groupController.updateGroup);
router.post('/:id/members', protect, groupController.addMembers);
router.delete('/:id/members/:userId', protect, groupController.removeMember);
router.get('/:id/messages', protect, groupController.getGroupMessages);

module.exports = router;
