// /supabase/functions/callproof-api/config.ts
// Action mappings from instruction document
export const actionMappings = {
  appointments: {
    path: (id)=>`/ai/salescoach/contact/${id}/appointments`,
    method: "GET",
    needsContactId: true,
    dateHints: {
      startParam: "start",
      endParam: "end",
      format: "YYYY-MM-DD"
    }
  },
  opportunities: {
    path: (id)=>`/ai/salescoach/contact/${id}/opportunities`,
    method: "GET",
    needsContactId: true
  },
  eventform: {
    path: (id)=>`/ai/salescoach/contact/${id}/eventform`,
    method: "GET",
    needsContactId: true
  },
  notes: {
    path: (id)=>`/ai/salescoach/contact/${id}/contact-note`,
    method: "GET",
    needsContactId: true
  },
  tasks: {
    path: (id)=>`/ai/salescoach/contact/${id}/tasks`,
    method: "GET",
    needsContactId: true,
    dateHints: {
      startParam: "start_date",
      endParam: "end_date",
      format: "DD-MM-YYYY"
    }
  },
  contact_search: {
    path: ()=>`/ai/salescoach/account-list`,
    method: "POST",
    needsContactId: false
  }
};
// Field code mapping from instruction document
export const fieldCodeMap = {
  CompanyName: 1,
  FirstName: 2,
  LastName: 3,
  Street: 4,
  City: 5,
  State: 6,
  ZipCode: 7,
  Email: 8,
  Phone: 9,
  Account: 10,
  ParentCompany: 11,
  BusinessType: 12,
  County: 13,
  Country: 14,
  Region: 15
};
// Sort contacts mapping from instruction document
export const sortContactsMap = {
  closestToMe: 0,
  FarthestAway: 1,
  NeedToContact: 2,
  RecentlyContact: 3,
  'Company[A-Z]': 4,
  'Company[Z-A]': 5,
  SortMin: 0,
  SortMax: 5
};
// Call type mapping from instruction document
export const callTypeMap = {
  all: 0,
  outgoing: 1,
  incoming: 2,
  missed: 3
};
