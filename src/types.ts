export interface Lesson {
  id: number;
  name: string;
  date: Date;
  cancelled: boolean;
}

export interface User {
  id: string;
  untis_username: string;
  untis_password: string;
  untis_school_name: string;
  untis_server: string;
  timetable: string;
  discord_user_id: string;
}
