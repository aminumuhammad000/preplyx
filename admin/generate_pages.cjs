const fs = require('fs');
const pages = ['Users', 'Exams', 'Subjects', 'Simulation', 'Wallet', 'AIAssistant', 'Analytics', 'Notifications', 'Support', 'Settings'];
if (!fs.existsSync('src/pages')) {
  fs.mkdirSync('src/pages', { recursive: true });
}
pages.forEach(p => {
  const content = `import React from 'react';

export const ${p}: React.FC = () => {
  return (
    <div>
      <h1 className='text-2xl font-semibold'>${p} Management</h1>
      <p className='text-muted mt-2'>This view is currently under construction.</p>
    </div>
  );
};
`;
  fs.writeFileSync('src/pages/' + p + '.tsx', content);
});
console.log('Pages generated successfully!');
