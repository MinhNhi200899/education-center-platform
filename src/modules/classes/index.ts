// Classes module exports
export * from './classes.controller';
export * from './classes.routes';
export * from './types/class.types';
export {
  createClassSchema,
  updateClassSchema,
  queryClassSchema,
  assignTeacherSchema,
  bulkAssignTeachersSchema,
  enrollStudentsSchema,
  withdrawStudentSchema,
} from './validators/class.validators';
export { classService } from './services/class.service';
export { scheduleService } from './services/schedule.service';

import classesRouter from './classes.routes';
export { classesRouter };