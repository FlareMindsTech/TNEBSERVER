import fs from 'fs';
import path from 'path';

const file = path.resolve('..', 'TNEBADMINDASHBOARD', 'TNEBADMINDASHBOARD', 'src', 'routes.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('/committees')) {
  const entry = `  {
    path: "/committees",
    name: "Committees (CEC / EBF)",
    icon: <FaUsers color={ICON_COLOR} />,
    element: <Committees />,
    layout: "/admin",
  },
`;
  content = content.replace(/\{\s*path:\s*["']\/profile["']/, entry + '  {\n    path: "/profile"');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully added /committees route');
} else {
  console.log('Route already present');
}
