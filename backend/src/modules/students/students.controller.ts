import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import type { CreateStudentDTO, UpdateStudentDTO } from './students.types.ts';
import { STUDY_PLAN_VALUES } from './study-plans.ts';
import * as studentService from './students.service.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
  resolveAuthorizedBranchId,
} from '../auth/auth.authorization.ts';

const VALID_STUDY_PLANS = new Set<string>(STUDY_PLAN_VALUES);
const VALID_GENDERS = new Set(['male', 'female', 'other']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

function parseBranchId(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? Number.NaN : parsedValue;
}

function parseIncludeInactive(value: unknown): boolean | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  return undefined;
}

function parseLimit(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? Number.NaN : parsedValue;
}

function hasOwnField(object: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// GET /api/students - Get all students
export async function getStudents(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const requestedBranchId = parseBranchId(req.query.branch_id);
    const includeInactive = parseIncludeInactive(req.query.include_inactive);
    const search =
      typeof req.query.search === 'string' && req.query.search.trim() !== ''
        ? req.query.search.trim()
        : undefined;
    const limit = parseLimit(req.query.limit);

    // Only validate if branch_id was actually provided in query
    if (requestedBranchId !== undefined && Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    if (
      req.query.include_inactive != null &&
      includeInactive == null
    ) {
      return badRequest(res, 'Invalid include_inactive value');
    }

    if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 50)) {
      return badRequest(res, 'Invalid limit. Must be between 1 and 50');
    }

    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const students = await studentService.getAllStudents(
      branchId,
      includeInactive ?? false,
      search,
      limit,
    );

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
    });
  }
}

// GET /api/students/:id - Get single student by ID
export async function getStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const student = await studentService.getStudentById(id, branchId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch student',
    });
  }
}

// POST /api/students - Create new student
export async function createStudent(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const {
      name,
      phone,
      email,
      study_plan,
      branch_id,
      date_of_birth,
      gender,
      blood_group,
      address,
      city,
      state,
      pincode,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      id_proof_type,
      id_proof_number,
    } = req.body as Partial<CreateStudentDTO>;

    const requestedBranchId =
      typeof branch_id === 'string' ? Number.parseInt(branch_id, 10) : branch_id;
    const normalizedEmail = email?.trim();
    const normalizedEmergencyContactName =
      typeof emergency_contact_name === 'string' ? emergency_contact_name.trim() : '';
    const normalizedEmergencyContactPhone =
      typeof emergency_contact_phone === 'string' ? emergency_contact_phone.trim() : '';
    const normalizedEmergencyContactRelation =
      typeof emergency_contact_relation === 'string' ? emergency_contact_relation.trim() : '';

    if (!name?.trim()) {
      return badRequest(res, 'Name is required');
    }

    if (!phone?.trim()) {
      return badRequest(res, 'Phone is required');
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return badRequest(res, 'Phone must be 10 digits');
    }

    if (!study_plan) {
      return badRequest(res, 'Study plan is required');
    }

    console.log('Received study_plan:', study_plan);
console.log('Available plans:', STUDY_PLAN_VALUES);
console.log('Valid plans set:', [...VALID_STUDY_PLANS]);
console.log('Has plan?', VALID_STUDY_PLANS.has(study_plan));

    if (!VALID_STUDY_PLANS.has(study_plan)) {
      return badRequest(res, 'Invalid study plan');
    }

    if (
      requestedBranchId != null &&
      (!Number.isInteger(requestedBranchId) || requestedBranchId <= 0)
    ) {
      return badRequest(res, 'Branch is required');
    }

    const normalizedBranchId = resolveAuthorizedBranchId(
      user,
      requestedBranchId,
    );

    if (!normalizedBranchId) {
      return badRequest(res, 'Branch is required');
    }

    if (!date_of_birth) {
      return badRequest(res, 'Date of birth is required');
    }

    if (Number.isNaN(Date.parse(date_of_birth))) {
      return badRequest(res, 'Date of birth is invalid');
    }

    if (!gender) {
      return badRequest(res, 'Gender is required');
    }

    if (!VALID_GENDERS.has(gender)) {
      return badRequest(res, 'Invalid gender');
    }

    if (!address?.trim()) {
      return badRequest(res, 'Address is required');
    }

    if (!city?.trim()) {
      return badRequest(res, 'City is required');
    }

    if (!state?.trim()) {
      return badRequest(res, 'State is required');
    }

    if (!pincode?.trim() || !/^\d{6}$/.test(pincode.trim())) {
      return badRequest(res, 'Valid 6-digit PIN code is required');
    }

    if (
      normalizedEmergencyContactPhone
      && !/^\d{10}$/.test(normalizedEmergencyContactPhone)
    ) {
      return badRequest(res, 'Emergency phone must be 10 digits when provided');
    }

    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return badRequest(res, 'Invalid email');
    }

    const student = await studentService.createStudent({
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail || null,
      study_plan,
      branch_id: normalizedBranchId,
      date_of_birth,
      gender,
      blood_group: blood_group?.trim() || null,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      emergency_contact_name: normalizedEmergencyContactName || null,
      emergency_contact_phone: normalizedEmergencyContactPhone || null,
      emergency_contact_relation: normalizedEmergencyContactRelation || null,
      id_proof_type: id_proof_type?.trim() || null,
      id_proof_number: id_proof_number?.trim() || null,
    });

    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student',
    });
  }
}

// PUT /api/students/:id - Update existing student
export async function updateStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);
    const updateData = { ...req.body } as Record<string, unknown>;

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest(res, 'No fields to update');
    }

    if (
      hasOwnField(updateData, 'study_plan')
      && updateData.study_plan != null
      && (
        typeof updateData.study_plan !== 'string'
        || !VALID_STUDY_PLANS.has(updateData.study_plan)
      )
    ) {
      return badRequest(res, 'Invalid study plan');
    }

    if (hasOwnField(updateData, 'emergency_contact_name')) {
      const value = updateData.emergency_contact_name;

      if (value != null && typeof value !== 'string') {
        return badRequest(res, 'Emergency contact name must be text');
      }

      updateData.emergency_contact_name =
        typeof value === 'string' && value.trim() !== ''
          ? value.trim()
          : null;
    }

    if (hasOwnField(updateData, 'emergency_contact_phone')) {
      const value = updateData.emergency_contact_phone;

      if (value != null && typeof value !== 'string') {
        return badRequest(res, 'Emergency contact phone must be text');
      }

      const normalizedValue = typeof value === 'string' ? value.trim() : '';

      if (normalizedValue && !/^\d{10}$/.test(normalizedValue)) {
        return badRequest(res, 'Emergency phone must be 10 digits when provided');
      }

      updateData.emergency_contact_phone = normalizedValue || null;
    }

    if (hasOwnField(updateData, 'emergency_contact_relation')) {
      const value = updateData.emergency_contact_relation;

      if (value != null && typeof value !== 'string') {
        return badRequest(res, 'Emergency contact relation must be text');
      }

      updateData.emergency_contact_relation =
        typeof value === 'string' && value.trim() !== ''
          ? value.trim()
          : null;
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const updatedStudent = await studentService.updateStudent(
      id,
      updateData as UpdateStudentDTO,
      branchId,
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
    });
  }
}

// DELETE /api/students/:id - Delete student (soft delete)
export async function deleteStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const deleted = await studentService.deleteStudent(id, branchId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Student not found or already deleted',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student marked as inactive successfully',
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
    });
  }
}

// PATCH /api/students/:id/reactivate - Reactivate student
export async function reactivateStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const student = await studentService.reactivateStudent(id, branchId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found or already active',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student reactivated successfully',
      data: student,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Reactivate student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate student',
    });
  }
}
