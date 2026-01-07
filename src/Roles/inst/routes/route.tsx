import { Route } from "react-router-dom";

import { Attendance } from "../modules/attendance/attendance";
import { Class } from "../modules/attendance/pages/Class";
export default function instRoutes() {
  return (
    <Route path="/inst">
        <Route path="attendance" element={<Attendance />}>
  <Route path="class" element={<Class />} />
  {/* PAGE_ROUTES_ATTENDANCE */}
</Route>
        {/* MODULE_ROUTES */}
    </Route>
  );
}
