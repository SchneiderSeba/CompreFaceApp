const database = await import(process.env.DATABASE_URL?.trim()
  ? './database-postgres.js'
  : './database.js');

export const databaseDriver = database.databaseDriver || 'sqlite';
export const adminConfiguration = database.adminConfiguration;
export const verifyPassword = database.verifyPassword;
export const findAdminByUsername = (...args) => Promise.resolve(database.findAdminByUsername(...args));
export const createSession = (...args) => Promise.resolve(database.createSession(...args));
export const getUserBySession = (...args) => Promise.resolve(database.getUserBySession(...args));
export const deleteSession = (...args) => Promise.resolve(database.deleteSession(...args));
export const createEmployee = (...args) => Promise.resolve(database.createEmployee(...args));
export const listEmployees = (...args) => Promise.resolve(database.listEmployees(...args));
export const getEmployeeBySubject = (...args) => Promise.resolve(database.getEmployeeBySubject(...args));
export const getEmployeeById = (...args) => Promise.resolve(database.getEmployeeById(...args));
export const updateEmployee = (...args) => Promise.resolve(database.updateEmployee(...args));
export const createCheckIn = (...args) => Promise.resolve(database.createCheckIn(...args));
export const getDashboardStats = (...args) => Promise.resolve(database.getDashboardStats(...args));
export const checkDatabaseConnection = database.checkDatabaseConnection
  ? (...args) => Promise.resolve(database.checkDatabaseConnection(...args))
  : async () => databaseDriver;
export const closeDatabase = (...args) => Promise.resolve(database.closeDatabase(...args));
