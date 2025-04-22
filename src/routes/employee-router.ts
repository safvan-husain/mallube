import {Router} from 'express';
import {
    createEmployee,
    getAllEmployeesOfPrivilege, getSpecificEmployee,
    loginEmployee,
    updateEmployee,
} from "../controllers/marketting-section/employee/staff-manager-controller";
import {employeeProtect} from "../middleware/auth";
import {
    createPendingStore,
    getPendingBusinessCountForStaffPerDayForMonth,
    getPendingBusinessDashBoardData, getPendingStores, getSpecificPendingBusiness,
    getStaffAndPendingBusinessCount,
    updateSpecificPendingBusiness
} from "../controllers/marketting-section/employee/pending-business-controller";
import {
    businessCountAddedByStaffPerManager,
    createBusiness, getBusinessCountForStaffPerDayForMonth, getBusinessesPerEmployee,
    getBusinessProfile, getGraphDataForMonth, updateBusinessProfile
} from "../controllers/marketting-section/employee/business-manage-controller";
import {
    getAllStaffAttendanceForThisDay,
    getAttendanceListForMonth,
    getAttendanceOfSpecificEmployeeSpecificMonth
} from "../controllers/marketting-section/employee/attendance-controller";

const router = Router();

router.route('/staff')
    .get(employeeProtect, getAllEmployeesOfPrivilege)

router.route('/staff/:id')
    .put(employeeProtect, updateEmployee)
    .get(employeeProtect, getSpecificEmployee)

router.route('/login')
    .post(loginEmployee);

router.route('/create-staff')
    .post(employeeProtect, createEmployee)

router.route('/pending-business')
    .post(employeeProtect, createPendingStore)
    .get(employeeProtect, getPendingStores)

router.route('/pending-business/:id')
    .get(employeeProtect, getSpecificPendingBusiness)
    .put(employeeProtect, updateSpecificPendingBusiness)

router.route('/pending-business-per-day')
    .get(employeeProtect, getPendingBusinessCountForStaffPerDayForMonth)

router.route('/pending-business-per-staff')
    .get(employeeProtect, getStaffAndPendingBusinessCount)

router.route('/pending-dashboard')
    .get(employeeProtect, getPendingBusinessDashBoardData)

router.route('/business')
    .post(employeeProtect, createBusiness)

router.route('/business/:id')
    .get(employeeProtect, getBusinessProfile)
    .put(employeeProtect, updateBusinessProfile)

router.route('/business-per-day')
    .get(employeeProtect, getBusinessCountForStaffPerDayForMonth)

router.route('/business-count-per-staff')
    .get(employeeProtect, businessCountAddedByStaffPerManager)

router.route('/business-per-staff')
    .get(employeeProtect, getBusinessesPerEmployee)

router.route('/business-graph')
    .get(employeeProtect, getGraphDataForMonth)

router.route('/attendance-per-month-all-staff')
    .get(employeeProtect, getAttendanceListForMonth);

router.route('/staff-attendance-history')
    .get(employeeProtect, getAttendanceOfSpecificEmployeeSpecificMonth);

router.route('/all-staff-attendance-for-this-day')
    .get(employeeProtect, getAllStaffAttendanceForThisDay);

export {router as employeeRouter};