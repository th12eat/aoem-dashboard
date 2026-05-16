const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic();

const EVENT_PROMPTS = {
  wonders: 'This is a post-event results screen for "Wonders" in Age of Empires Mobile. Extract every player name and their point total. Players with 0 points or who are absent should be marked as 0.',
  dawns: 'This is a post-event results screen for "Battle of Dawns" in Age of Empires Mobile. Extract every player name and their point total.',
  gee: 'This is a post-event results screen for "GEE" (Greatest Empire Ever) in Age of Empires Mobile. Extract every player name and their point total.',
  kvk: 'This is a post-event results screen for "KvK" (Kingdom vs Kingdom) in Age of Empires Mobile. Extract every player name and their point total.',
  deserts: 'This is a post-event results screen for "Deserts" in Age of Empires Mobile. Extract every player name and their point total.',
  tmg: 'This is a rankings screen for "TMG" (The Mightiest Governor) in Age of Empires Mobile. Extract every player name, their rank position, and their current score/merit points.',
  unknown: 'This is a post-event results screen from Age of Empires Mobile. Extract every player name and their score/point total.'
};

async function extractFromImage(imageUrl, eventType) {
  const prompt = EVENT_PROMPTS[eventType] || EVENT_PROMPTS.unknown;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl }
        },
        {
          type: 'text',
          text: `${prompt}

Return ONLY a JSON array with objects containing:
- "player": the player's in-game name (preserve special characters, unicode, etc. exactly as shown)
- "score": their numeric point total (as a number, not string)
- "rank": their position/rank if visible (as a number, null if not shown)

Example: [{"player": "TommyTorpedo", "score": 15000000, "rank": 3}]

Be precise with player names - they often contain unicode, superscripts, special symbols. Reproduce them exactly.`
        }
      ]
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from Claude response');
  }
  return JSON.parse(jsonMatch[0]);
}

async function processAllImages(imageUrls, eventType) {
  const allResults = [];

  for (const url of imageUrls) {
    try {
      const results = await extractFromImage(url, eventType);
      allResults.push(...results);
    } catch (err) {
      console.error(`Failed to process image ${url}:`, err.message);
    }
  }

  return allResults;
}

function updateEventData(eventType, extracted) {
  const dataDir = path.join(__dirname, '..', 'data');
  const eventFile = path.join(dataDir, 'events', `${eventType}.json`);
  const playersFile = path.join(dataDir, 'players.json');

  if (!fs.existsSync(eventFile)) {
    console.log(`Event file not found: ${eventFile}, skipping update.`);
    return { updated: 0, new: 0, absent: 0 };
  }

  const eventData = JSON.parse(fs.readFileSync(eventFile, 'utf8'));
  const players = JSON.parse(fs.readFileSync(playersFile, 'utf8'));

  let updated = 0;
  let newEntries = 0;

  for (const entry of extracted) {
    const existing = eventData.find(e =>
      e.player.toLowerCase() === entry.player.toLowerCase()
    );

    if (existing) {
      existing.dkp_points = (existing.dkp_points || 0) + (entry.score > 0 ? 50 : 0);
      updated++;
    } else {
      const playerRecord = players.find(p =>
        p.name.toLowerCase() === entry.player.toLowerCase()
      );
      eventData.push({
        player: entry.player,
        alliance: playerRecord ? playerRecord.alliance : null,
        dkp_points: entry.score > 0 ? 50 : 0,
      });
      newEntries++;
    }
  }

  const absent = extracted.filter(e => e.score === 0).length;

  fs.writeFileSync(eventFile, JSON.stringify(eventData, null, 2));

  return { updated, new: newEntries, absent };
}

function updateTmgData(extracted) {
  const dataDir = path.join(__dirname, '..', 'data');
  const tmgFile = path.join(dataDir, 'tmg', 'season7.json');
  const incidentsFile = path.join(dataDir, 'incidents.json');

  const tmgData = JSON.parse(fs.readFileSync(tmgFile, 'utf8'));
  const incidents = JSON.parse(fs.readFileSync(incidentsFile, 'utf8'));

  const completedSeries = new Set(tmgData.completed.map(e => e.series));
  const activeSeries = tmgData.announced.filter(e => !completedSeries.has(e.series));

  const breakers = [];

  for (const ranked of extracted) {
    const assignedSlot = activeSeries.find(s =>
      s.player && s.player.toLowerCase() === ranked.player.toLowerCase()
    );

    if (assignedSlot) {
      if (assignedSlot.target_rank && ranked.rank && ranked.rank < assignedSlot.target_rank) {
        breakers.push({
          player: ranked.player,
          assigned_rank: assignedSlot.target_rank,
          actual_rank: ranked.rank,
          type: 'breaking_up'
        });
      }
    } else {
      if (ranked.rank && ranked.rank <= 50) {
        const displaced = activeSeries.find(s => s.target_rank === ranked.rank);
        breakers.push({
          player: ranked.player,
          actual_rank: ranked.rank,
          displaced: displaced ? displaced.player : null,
          type: 'unregistered_breaker'
        });
      }
    }
  }

  for (const breaker of breakers) {
    incidents.push({
      season: 7,
      series: null,
      player: breaker.player,
      alliance: null,
      target_rank: breaker.assigned_rank || null,
      final_rank: String(breaker.actual_rank),
      notes: breaker.type === 'breaking_up'
        ? `Breaking up: assigned rank ${breaker.assigned_rank}, currently at ${breaker.actual_rank}`
        : `Unregistered player in top 50 at rank ${breaker.actual_rank}${breaker.displaced ? `, displacing ${breaker.displaced}` : ''}`,
      type: 'kicked'
    });
  }

  fs.writeFileSync(incidentsFile, JSON.stringify(incidents, null, 2));

  return { breakers: breakers.length, checked: extracted.length };
}

async function main() {
  const imageUrls = JSON.parse(process.env.IMAGE_URLS || '[]');
  const eventType = process.env.EVENT_TYPE || 'unknown';

  if (imageUrls.length === 0) {
    const summary = 'No images found in the issue body.';
    fs.writeFileSync('/tmp/processing-summary.txt', summary);
    console.log(summary);
    return;
  }

  console.log(`Processing ${imageUrls.length} image(s) for event: ${eventType}`);

  const extracted = await processAllImages(imageUrls, eventType);
  console.log(`Extracted ${extracted.length} player entries`);

  let summary;
  if (eventType === 'tmg') {
    const result = updateTmgData(extracted);
    summary = `**TMG Check-in**\n- Players scanned: ${result.checked}\n- Breakers detected: ${result.breakers}`;
    if (result.breakers > 0) {
      summary += '\n\n**Breakers flagged — check incidents.json for details.**';
    }
  } else {
    const result = updateEventData(eventType, extracted);
    summary = `**${eventType.toUpperCase()} Event Update**\n- Players updated: ${result.updated}\n- New entries: ${result.new}\n- Absent (0 score): ${result.absent}`;
  }

  fs.writeFileSync('/tmp/processing-summary.txt', summary);
  console.log(summary);
}

main().catch(err => {
  const summary = `Error processing screenshots: ${err.message}`;
  fs.writeFileSync('/tmp/processing-summary.txt', summary);
  console.error(err);
  process.exit(1);
});
