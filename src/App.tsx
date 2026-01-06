import { BrowserRouter, useRoutes } from "react-router-dom";
import { studentRoutes } from "./Roles/student/routes/route";

function AppRoutes() {
  return useRoutes([
    ...studentRoutes,   
  ]);
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
