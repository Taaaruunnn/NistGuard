const nistControls = [
  {
    function: 'Govern',
    categoryId: 'GV.OC',
    categoryName: 'Organizational Context',
    subcategoryId: 'GV.OC-01',
    description: 'The organizational mission is understood and informs cybersecurity risk management.'
  },
  {
    function: 'Identify',
    categoryId: 'ID.AM',
    categoryName: 'Asset Management',
    subcategoryId: 'ID.AM-01',
    description: 'Inventories of hardware managed by the organization are maintained.'
  },
  {
    function: 'Protect',
    categoryId: 'PR.AA',
    categoryName: 'Identity Management & Access Control',
    subcategoryId: 'PR.AA-03',
    description: 'Users, services, and hardware are authenticated (e.g., MFA).'
  },
  {
    function: 'Detect',
    categoryId: 'DE.CM',
    categoryName: 'Continuous Monitoring',
    subcategoryId: 'DE.CM-01',
    description: 'Networks and network services are monitored to find potentially adverse events.'
  },
  {
    function: 'Respond',
    categoryId: 'RS.MA',
    categoryName: 'Incident Management',
    subcategoryId: 'RS.MA-01',
    description: 'The incident response plan is executed in coordination with relevant third parties.'
  },
  {
    function: 'Recover',
    categoryId: 'RC.RP',
    categoryName: 'Recovery Plan Execution',
    subcategoryId: 'RC.RP-03',
    description: 'The integrity of backups and other restoration assets is verified before using them.'
  }
];

module.exports = nistControls;