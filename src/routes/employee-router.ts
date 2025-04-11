import {Router} from 'express';
import {
    createEmployee,
    createPendingStore,
    getAllEmployeesOfPrivilege,
    getPendingBusinessCountForStaffPerDayForMonth, getPendingBusinessDashBoardData,
    getPendingStores,
    getSpecificPendingBusiness, getStaffAndBusinessCount,
    loginEmployee,
    updateEmployee,
    updateSpecificPendingBusiness
} from "../controllers/marketting-section/manager/auth-manager-controller";
import {employeeProtect} from "../middleware/auth";

const router = Router();

router.route('/staff')
    .get(employeeProtect, getAllEmployeesOfPrivilege)

router.route('/staff/:id')
    .put(employeeProtect, updateEmployee)

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
    .get(employeeProtect, getStaffAndBusinessCount)

router.route('/dashboard')
    .get(employeeProtect, getPendingBusinessDashBoardData)

export {router as employeeRouter};