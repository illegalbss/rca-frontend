/* ============================================
   ICT DEPARTMENT DATA — ict-data.js
   Royal Crystal Academy
   ============================================
   Single source of truth for all ICT department data.
   Only Basic 3–6 are taught by the ICT Department.

   GROUP 1: Basic 3 & Basic 4 — Computer confidence & safety
   GROUP 2: Basic 5 & Basic 6 — Digital skills & secondary prep
*/

(function () {

  /* ====================================================
     CURRICULUM DEFINITION
     ==================================================== */
  window.ICT_CURRICULUM = {

    GROUP1: {
      label: 'Group 1',
      classes: ['Basic 3', 'Basic 4'],
      objective: 'Teach pupils how to use a computer confidently and safely.',
      terms: {
        term1: {
          label: 'First Term',
          topics: [
            'Introduction to Computers',
            'Parts of a Computer',
            'Hardware and Software',
            'Uses of Computers',
            'Computer Safety Rules'
          ],
          practicals: [
            'Identify computer parts',
            'Point and name computer devices',
            'Demonstrate proper computer handling'
          ]
        },
        term2: {
          label: 'Second Term',
          topics: [
            'Mouse Skills',
            'Keyboard Skills',
            'Opening Programs',
            'Closing Programs',
            'Files and Folders'
          ],
          practicals: [
            'Left click, Right click, Double click',
            'Drag and drop',
            'Open Paint',
            'Open Microsoft Word',
            'Type names and simple words'
          ]
        },
        term3: {
          label: 'Third Term',
          topics: [
            'Microsoft Paint',
            'Microsoft Word Basics',
            'Saving Files',
            'Formatting Text'
          ],
          practicals: [
            'Draw a house in Paint',
            'Draw the Nigerian flag',
            'Type a short sentence',
            'Save a document',
            'Format text using bold and larger fonts'
          ]
        }
      },
      endOfTermAssessment: [
        'Open a program',
        'Draw in Paint',
        'Save a file',
        'Type a sentence',
        'Identify computer parts'
      ]
    },

    GROUP2: {
      label: 'Group 2',
      classes: ['Basic 5', 'Basic 6'],
      objective: 'Develop practical digital skills and prepare pupils for secondary school ICT.',
      terms: {
        term1: {
          label: 'First Term',
          topics: [
            'Microsoft Word Advanced',
            'Text Formatting',
            'Tables',
            'Inserting Pictures',
            'Internet Basics'
          ],
          practicals: [
            'Create a personal profile',
            'Design a timetable',
            'Insert images into documents',
            'Create formatted documents'
          ]
        },
        term2: {
          label: 'Second Term',
          topics: [
            'Microsoft Excel',
            'Rows and Columns',
            'Data Entry',
            'Basic Calculations'
          ],
          practicals: [
            'Create a score sheet',
            'Create a timetable',
            'Enter student data',
            'Calculate totals and averages'
          ]
        },
        term3: {
          label: 'Third Term',
          topics: [
            'Microsoft PowerPoint',
            'Presentation Design',
            'Internet Safety',
            'Introduction to HTML'
          ],
          practicals: [
            'Create a 3-slide presentation',
            'Design a school event presentation',
            'Create a simple HTML page',
            'Demonstrate safe internet practices'
          ]
        }
      },
      endOfTermAssessment: [
        'Create a Word document',
        'Create an Excel worksheet',
        'Create a PowerPoint presentation',
        'Build a simple HTML page'
      ]
    }
  };

  /* ====================================================
     SKILL TRACKING CATEGORIES
     ==================================================== */
  window.ICT_SKILLS = {
    GROUP1: [
      { id: 'typing',   label: 'Typing Skills',   icon: '⌨️' },
      { id: 'mouse',    label: 'Mouse Skills',     icon: '🖱️' },
      { id: 'word',     label: 'Word Processing',  icon: '📝' },
      { id: 'paint',    label: 'Paint / Drawing',  icon: '🎨' },
      { id: 'files',    label: 'File Management',  icon: '📁' }
    ],
    GROUP2: [
      { id: 'typing',   label: 'Typing Skills',    icon: '⌨️' },
      { id: 'word',     label: 'Word Skills',       icon: '📝' },
      { id: 'excel',    label: 'Excel Skills',      icon: '📊' },
      { id: 'ppt',      label: 'PowerPoint Skills', icon: '📑' },
      { id: 'html',     label: 'HTML Skills',       icon: '🌐' },
      { id: 'internet', label: 'Internet Safety',   icon: '🔒' }
    ]
  };

  /* ====================================================
     COMPUTER LABORATORY INVENTORY
     10 computers — tracked individually
     ==================================================== */
  window.ICT_COMPUTERS = [
    { id: 'PC-01', name: 'Computer 1',  status: 'working',  brand: 'Dell',    purchased: '2022-01-15', lastMaintenance: '2026-01-10', notes: '' },
    { id: 'PC-02', name: 'Computer 2',  status: 'working',  brand: 'Dell',    purchased: '2022-01-15', lastMaintenance: '2026-01-10', notes: '' },
    { id: 'PC-03', name: 'Computer 3',  status: 'working',  brand: 'HP',      purchased: '2022-03-20', lastMaintenance: '2026-02-05', notes: '' },
    { id: 'PC-04', name: 'Computer 4',  status: 'faulty',   brand: 'HP',      purchased: '2022-03-20', lastMaintenance: '2026-04-01', notes: 'Monitor flickering — awaiting repair' },
    { id: 'PC-05', name: 'Computer 5',  status: 'working',  brand: 'Lenovo',  purchased: '2023-05-10', lastMaintenance: '2026-01-10', notes: '' },
    { id: 'PC-06', name: 'Computer 6',  status: 'working',  brand: 'Lenovo',  purchased: '2023-05-10', lastMaintenance: '2026-01-10', notes: '' },
    { id: 'PC-07', name: 'Computer 7',  status: 'working',  brand: 'Lenovo',  purchased: '2023-05-10', lastMaintenance: '2026-03-15', notes: '' },
    { id: 'PC-08', name: 'Computer 8',  status: 'working',  brand: 'Lenovo',  purchased: '2023-05-10', lastMaintenance: '2026-03-15', notes: '' },
    { id: 'PC-09', name: 'Computer 9',  status: 'maintenance', brand: 'Asus', purchased: '2024-09-01', lastMaintenance: '2026-05-20', notes: 'Keyboard replaced — software update pending' },
    { id: 'PC-10', name: 'Computer 10', status: 'working',  brand: 'Asus',    purchased: '2024-09-01', lastMaintenance: '2026-05-20', notes: '' },
  ];

  /* ====================================================
     MAINTENANCE HISTORY
     ==================================================== */
  window.ICT_MAINTENANCE = [
    { date: '2026-05-20', pc: 'PC-09', type: 'Keyboard Replacement', technician: 'Chukwuma Izuchukwu', cost: 8500,  status: 'completed', notes: 'Original keyboard damaged by liquid' },
    { date: '2026-04-01', pc: 'PC-04', type: 'Monitor Fault',        technician: 'External Technician', cost: 0,     status: 'pending',   notes: 'Screen flickering — technician called' },
    { date: '2026-03-15', pc: 'PC-07', type: 'Routine Maintenance',  technician: 'Chukwuma Izuchukwu', cost: 0,     status: 'completed', notes: 'Dust cleaning, software updates' },
    { date: '2026-03-15', pc: 'PC-08', type: 'Routine Maintenance',  technician: 'Chukwuma Izuchukwu', cost: 0,     status: 'completed', notes: 'Dust cleaning, software updates' },
    { date: '2026-02-05', pc: 'PC-03', type: 'RAM Upgrade',          technician: 'Chukwuma Izuchukwu', cost: 15000, status: 'completed', notes: 'Upgraded from 2GB to 4GB RAM' },
    { date: '2026-01-10', pc: 'ALL',   type: 'Annual Service',        technician: 'Chukwuma Izuchukwu', cost: 5000,  status: 'completed', notes: 'Annual antivirus update and system check for all working PCs' },
  ];

  /* ====================================================
     LAB SCHEDULE (ICT classes only — Basic 3–6)
     ==================================================== */
  window.ICT_LAB_SCHEDULE = [
    { class: 'Basic 3', day: 'Monday',    time: '10:00 – 10:45 AM', computers: 10 },
    { class: 'Basic 4', day: 'Tuesday',   time: '10:00 – 10:45 AM', computers: 10 },
    { class: 'Basic 5', day: 'Wednesday', time: '10:00 – 10:45 AM', computers: 10 },
    { class: 'Basic 6', day: 'Thursday',  time: '10:00 – 10:45 AM', computers: 10 },
    { class: 'ICT Club', day: 'Friday',   time: '2:00 – 3:30 PM',   computers: 10 },
  ];

  /* ====================================================
     GENERATE STUDENT ICT PROGRESS SCORES
     Per student per skill — scores 1-100
     ==================================================== */
  function seedRandom(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function generateProgress(students) {
    const ICT_CLASSES = ['Basic 3','Basic 4','Basic 5','Basic 6'];
    const progress = {};

    students.filter(s => ICT_CLASSES.includes(s.class_name)).forEach(s => {
      const isGroup2 = ['Basic 5','Basic 6'].includes(s.class_name);
      const skills   = isGroup2 ? window.ICT_SKILLS.GROUP2 : window.ICT_SKILLS.GROUP1;
      const seed     = seedRandom(s.admission_no);

      progress[s.admission_no] = {};
      skills.forEach((skill, i) => {
        // Realistic spread: typing tends to be lower, mouse higher
        const base = 45 + (seed * (i + 3)) % 45;
        const adjust = skill.id === 'typing' ? -5
                     : skill.id === 'mouse'   ? 10
                     : skill.id === 'html'    ? -10
                     : skill.id === 'excel'   ? -5
                     : 0;
        progress[s.admission_no][skill.id] = Math.min(100, Math.max(20, base + adjust));
      });

      // Practical assessment score (end of term)
      progress[s.admission_no].practical = 40 + (seed % 55);
    });

    return progress;
  }

  // Will be populated when SAMPLE_STUDENTS is available
  window.ICT_PROGRESS = {};
  window.generateICTProgress = function() {
    if (!window.SAMPLE_STUDENTS) return;
    window.ICT_PROGRESS = generateProgress(window.SAMPLE_STUDENTS);
  };

})();
