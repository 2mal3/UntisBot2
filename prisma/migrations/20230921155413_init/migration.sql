-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "untis_username" TEXT NOT NULL,
    "untis_password" TEXT NOT NULL,
    "untis_school_name" TEXT NOT NULL,
    "untis_server" TEXT NOT NULL,
    "timetable" TEXT NOT NULL DEFAULT '[]',
    "discord_user_id" TEXT NOT NULL
);
