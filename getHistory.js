const axios = require('axios');
const fs = require('fs');

const username = 'USERNAME';
const password = 'PASSWORD';
const url = 'https://YOURDOMAIN.collibra.com/graphql';

const query = `
query History(
  $id: String
  $categories: [ActivityFilterCategory]
  $count: Int
  $offset: Int
  $startDate: Long
  $endDate: Long
  $activityTypeValue: ActivityType
  $performedByUserId: String
  $taskId: ID
) {
  api {
    activities(
      first: $count
      offset: $offset
      contextId: $id
      categories: $categories
      taskId: $taskId
      startDate: $startDate
      endDate: $endDate
      activityType: $activityTypeValue
      performedByUserId: $performedByUserId
    ) {
      edges {
        ...Activity
      }
    }
  }
}

fragment Activity on ActivityEdge {
  node {
    id
    author {
      id
      name
    }
    description
    timestamp
    callId
    cause
    activityType
    mentionedUsers {
      __typename
      id
      firstName
      lastName
      userName
      enabled
    }
  }
}
`;

function parseDescription(desc) {
  if (!desc) return {};
  try {
    return JSON.parse(desc);
  } catch (e) {
    return { raw: desc };
  }
}

function printActivities(activities) {
  activities.forEach(({ node }, idx) => {
    let desc = node.description;
    let formattedDesc = typeof desc === 'string' ? parseDescription(desc) : desc;
    console.log(`\n--- Activity #${idx + 1} ---`);
    console.log(`Type: ${node.activityType}`);
    console.log(`Time: ${new Date(node.timestamp).toLocaleString()}`);
    console.log(`Author: ${node.author.name}`);
    console.log('Description:', formattedDesc);
  });
}

/**
 * Fetch *all* activities (with pagination), then filter by field.
 */
async function fetchHistory(fieldFilter, opts = {}) {
  const BATCH_SIZE = 100;
  const MAX_PAGES = 100;
  let allActivities = [];
  let offset = 0;
  let keepFetching = true;
  let page = 0;

  while (keepFetching && page < MAX_PAGES) {
    const START_DATE = 1735689600000; // January 1, 2025 00:00:00 UTC
    const variables = {
      count: BATCH_SIZE,
      offset: offset,
      activityTypeValue: null,
      categories: null,
      startDate:  START_DATE,
      endDate: null,
      id: opts.assetId || null,
      taskId: null,
      performedByUserId: null
    };
    try {
      const response = await axios.post(
        url,
        { query, variables },
        {
          auth: { username, password },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let activities = (response.data?.data?.api?.activities?.edges || []).map(edge => {
        if (edge.node && typeof edge.node.description === 'string') {
          edge.node.description = parseDescription(edge.node.description);
        }
        return edge;
      });

      allActivities.push(...activities);

      if (activities.length < BATCH_SIZE) {
        keepFetching = false;
      } else {
        offset += BATCH_SIZE;
      }

      page += 1; // Increment page count
    } catch (error) {
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.data);
      } else {
        console.error('Error:', error.message);
      }
      throw error;
    }
  }

  // Now filter after all data is accumulated
  let filteredActivities = allActivities;
  if (fieldFilter) {
    filteredActivities = allActivities.filter(edge =>
      edge.node &&
      edge.node.description &&
      typeof edge.node.description === 'object' &&
      edge.node.description.field === fieldFilter
    );
  }

  printActivities(filteredActivities);

  const output = {
    data: {
      api: {
        activities: {
          edges: filteredActivities
        }
      }
    }
  };
  fs.writeFileSync('activities.json', JSON.stringify(output, null, 2));
  console.log('Saved all filtered results to activities.json');
  return output;
}


// Uncomment to run directly (for testing or CLI use)
if (require.main === module) {
  const filter = process.argv[2] || "Last run date";
  fetchHistory(filter);
}

module.exports = fetchHistory;
