import { BrowserRouter, useRoutes } from "react-router-dom";
// import { studentRoutes } from "./Roles/student/routes/route";
import { TeacherRoutes } from "./Roles/Teacher/routes/route";

function AppRoutes() {
  return useRoutes([
    ...TeacherRoutes,   
  ]);
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
