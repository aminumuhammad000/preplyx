import { Router } from 'express';
import { getExams, getExamSubjects, getSubjectCategories, getSubjectIcons, getSubjectTips, getExamAvailability } from '../controllers/examController';

const router = Router();

router.get('/', getExams);
router.get('/availability', getExamAvailability);
router.get('/categories', getSubjectCategories);
router.get('/icons', getSubjectIcons);
router.get('/tips', getSubjectTips);
router.get('/:exam/subjects', getExamSubjects);

export default router;