import { SQLDatabase } from "encore.dev/storage/sqldb";

export const analysisDB = new SQLDatabase("analysis", {
  migrations: "./migrations",
});
