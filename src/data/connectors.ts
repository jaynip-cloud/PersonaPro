import { Connector } from '../types';

export const initialConnectors: Connector[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Pulls public profile info and posts to identify decision-makers, tone, and company updates.',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg',
    status: 'not_connected',
    isPriority: true,
    dataTypes: ['Social Profiles', 'Recent Posts', 'Network Info'],
    scopes: ['Read profile', 'View connections', 'Access posts'],
    fieldMapping: {
      'profile.name': 'Client Name',
      'profile.title': 'Role',
      'profile.headline': 'Professional Headline',
      'posts': 'Recent Activity'
    }
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Imports tweets, engagement metrics, and social sentiment from public profiles.',
    logo: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png',
    status: 'not_connected',
    isPriority: true,
    dataTypes: ['Tweets', 'Mentions', 'Engagement'],
    scopes: ['Read tweets', 'View profile', 'Access timeline'],
    fieldMapping: {
      'profile.username': 'Twitter Handle',
      'tweets': 'Recent Posts',
      'metrics': 'Social Engagement'
    }
  },
  {
    id: 'website',
    name: 'Website & Blogs',
    description: 'Extracts company headline, services, tech stack hints, and blog topics by scanning the public site.',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/chrome/chrome-original.svg',
    status: 'not_connected',
    isPriority: true,
    dataTypes: ['Company Info', 'Services', 'Blog Posts', 'Tech Stack'],
    scopes: ['Scrape website', 'Parse content', 'Extract metadata'],
    fieldMapping: {
      'domain': 'Website',
      'services': 'Company Services',
      'blog_urls': 'Blog Links',
      'tech_stack': 'Technology'
    }
  },
  {
    id: 'contact',
    name: 'Contact Info',
    description: 'Adds contact emails & phone numbers discovered in CRM or site; updates Contacts.',
    logo: 'https://www.svgrepo.com/show/452213/gmail.svg',
    status: 'not_connected',
    isPriority: true,
    dataTypes: ['Email', 'Phone', 'Address'],
    scopes: ['Read contacts', 'Verify emails', 'Update records'],
    fieldMapping: {
      'email': 'Email Address',
      'phone': 'Phone Number',
      'address': 'Physical Address'
    }
  },
  {
    id: 'documents',
    name: 'Documents',
    description: 'Upload or sync client documents (PDF, Word, Excel, PPT). These are used for meeting intelligence and research.',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/filezilla/filezilla-plain.svg',
    status: 'not_connected',
    isPriority: true,
    dataTypes: ['PDFs', 'Word Docs', 'Spreadsheets', 'Presentations'],
    scopes: ['Upload files', 'Read documents', 'Extract content'],
    fieldMapping: {
      'filename': 'Document Name',
      'type': 'File Type',
      'content': 'Extracted Text'
    }
  },
  {
    id: 'fathom',
    name: 'Fathom',
    description: 'Ingest Fathom meeting transcripts to extract action items, sentiment and follow-ups.',
    logo: 'https://assets-global.website-files.com/62235f7c8b98c03861fc740c/62235f7c8b98c0e4e9fc742b_fathom-icon-gradient.svg',
    status: 'not_connected',
    isPriority: true,
    dataTypes: ['Transcripts', 'Action Items', 'Sentiment', 'Speakers'],
    scopes: ['Read transcripts', 'Access meetings', 'View recordings'],
    fieldMapping: {
      'transcript': 'Meeting Transcript',
      'speakers': 'Participants',
      'action_items': 'Follow-up Tasks'
    }
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync contacts, opportunities, and account data from Salesforce CRM.',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/salesforce/salesforce-original.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Contacts', 'Accounts', 'Opportunities', 'Activities'],
    scopes: ['Read contacts', 'Access accounts', 'View opportunities'],
    fieldMapping: {
      'contact': 'CRM Contact',
      'account': 'Company Record',
      'opportunity': 'Sales Pipeline'
    }
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Import contacts, deals, and marketing engagement data from HubSpot.',
    logo: 'https://www.svgrepo.com/show/331433/hubspot.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Contacts', 'Deals', 'Email Engagement', 'Forms'],
    scopes: ['Read contacts', 'Access deals', 'View engagement'],
    fieldMapping: {
      'contact': 'HubSpot Contact',
      'deal': 'Sales Deal',
      'engagement': 'Marketing Activity'
    }
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Access email conversations, threads, and attachments from Gmail.',
    logo: 'https://www.svgrepo.com/show/452213/gmail.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Emails', 'Threads', 'Attachments', 'Labels'],
    scopes: ['Read emails', 'View threads', 'Access attachments'],
    fieldMapping: {
      'email': 'Email Thread',
      'attachments': 'File Attachments',
      'labels': 'Categories'
    }
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Sync email communications and calendar events from Microsoft Outlook.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Emails', 'Calendar', 'Contacts', 'Tasks'],
    scopes: ['Read mail', 'Access calendar', 'View contacts'],
    fieldMapping: {
      'email': 'Email Message',
      'calendar': 'Meetings',
      'contacts': 'Address Book'
    }
  },
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Import meeting recordings, transcripts, and participant data from Zoom.',
    logo: 'https://www.svgrepo.com/show/349609/zoom.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Recordings', 'Transcripts', 'Chat Logs', 'Participants'],
    scopes: ['Access recordings', 'Read transcripts', 'View participants'],
    fieldMapping: {
      'recording': 'Video Recording',
      'transcript': 'Meeting Transcript',
      'participants': 'Attendees'
    }
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Sync Teams meetings, chats, and shared files for client interactions.',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-plain.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Meetings', 'Chats', 'Files', 'Calls'],
    scopes: ['Read chats', 'Access meetings', 'View files'],
    fieldMapping: {
      'chat': 'Team Chat',
      'meeting': 'Teams Meeting',
      'files': 'Shared Files'
    }
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Access and sync documents, spreadsheets, and presentations from Google Drive.',
    logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Docs', 'Sheets', 'Slides', 'PDFs'],
    scopes: ['Read files', 'Access folders', 'View metadata'],
    fieldMapping: {
      'file': 'Drive Document',
      'folder': 'Folder Structure',
      'metadata': 'File Info'
    }
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    description: 'Sync enterprise documents and collaboration data from SharePoint.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282019%E2%80%93present%29.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Documents', 'Lists', 'Sites', 'Libraries'],
    scopes: ['Read documents', 'Access sites', 'View lists'],
    fieldMapping: {
      'document': 'SharePoint File',
      'site': 'Team Site',
      'list': 'Data List'
    }
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    description: 'Fetch company funding, investors, and market intelligence from Crunchbase.',
    logo: 'https://images.crunchbase.com/image/upload/c_pad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/v1442937026/aowwka6soi2bkglcevse.png',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Company Data', 'Funding Rounds', 'Investors', 'News'],
    scopes: ['Read company profiles', 'Access funding data', 'View news'],
    fieldMapping: {
      'company': 'Company Profile',
      'funding': 'Investment Data',
      'news': 'Market News'
    }
  },
  {
    id: 'clutch',
    name: 'Clutch',
    description: 'Import client reviews, ratings, and case studies from Clutch profiles.',
    logo: 'https://clutch.co/sites/default/files/logos/clutch-icon-full-black.svg',
    status: 'not_connected',
    isPriority: false,
    dataTypes: ['Reviews', 'Ratings', 'Case Studies', 'Portfolio'],
    scopes: ['Read reviews', 'Access ratings', 'View portfolio'],
    fieldMapping: {
      'review': 'Client Review',
      'rating': 'Service Rating',
      'case_study': 'Project Example'
    }
  }
];
