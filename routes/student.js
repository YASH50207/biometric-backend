const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Student = require('../models/Student');

// ============ POST /api/students/register ============
// Register a new student with fingerprint ID
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('rollNumber').notEmpty().withMessage('Roll number is required'),
  body('fingerprintId').isInt().withMessage('Fingerprint ID must be an integer'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, rollNumber, fingerprintId, email } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [{ rollNumber }, { fingerprintId }],
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this roll number or fingerprint ID already exists',
      });
    }

    // Create new student
    const student = new Student({
      name,
      rollNumber,
      fingerprintId,
      email,
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: '✅ Student registered successfully',
      student: {
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        fingerprintId: student.fingerprintId,
        email: student.email,
      },
    });
  } catch (error) {
    console.error('❌ Error registering student:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message,
    });
  }
});

// ============ GET /api/students ============
// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ enrolledDate: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
});

// ============ GET /api/students/:id ============
// Get a specific student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message,
    });
  }
});

// ============ PUT /api/students/:id ============
// Update student information
router.put('/:id', [
  body('name').optional().notEmpty(),
  body('email').optional().isEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message,
    });
  }
});

// ============ DELETE /api/students/:id ============
// Delete a student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully',
      data: student,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message,
    });
  }
});

module.exports = router;
