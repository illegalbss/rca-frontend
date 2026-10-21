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
  // Computers, repairs and the lab timetable are kept on the school server
  // (ICT Lab page, via /api/ict-lab). These were sample lists; now empty.
  window.ICT_COMPUTERS = [];

  /* ====================================================
     MAINTENANCE HISTORY
     ==================================================== */
  window.ICT_MAINTENANCE = [];

  /* ====================================================
     LAB SCHEDULE (ICT classes only — Basic 3–6)
     ==================================================== */
  window.ICT_LAB_SCHEDULE = [];

  // Pupils' ICT progress is recorded on the ICT Lab page (saved on the
  // school server). There is no made-up progress any more.
  window.ICT_PROGRESS = {};

})();
