const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const app = express();
const port = 3000;

const AUDIO_FILE_PATH = "audiofiles//Moss.mp3";// Moss.mp3";//ewaste.wav';
const API_KEY = "96f80902bdc041038ea98dc3b7589cfe"
const TRANSCRIPTS_DIR = "transcripts/";

const API_URL = "https://api.openai.com/v1/audio/transcriptions"
const OPENAI_API_KEY = "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"

async function transcribeUsingWhisperAPI(audioUrl) {
  try {
    /*
    https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F file="@/path/to/file/audio.mp3" \
  -F model="whisper-1"
  */
    // Initiate transcription using the upload URL
    const transcriptResponse = await initiateTranscription(audioUrl);
    const transcriptId = transcriptResponse.id;

    // Retrieve the complete transcript text
    const transcriptText = await getTranscriptText(transcriptId);

    // Generate a unique filename for the transcript
    const filename = `${transcriptId}.txt`;
    const filePath = TRANSCRIPTS_DIR + filename;

    // Save the transcript text to a local file
    fs.writeFileSync(filePath, transcriptText);
    res.json({ transcriptId, filename }); // Send back transcript ID and filename
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: "Transcription failed" });
  }   
};

// Function to initiate transcription (replace with actual cloud service API call)
async function initiateTranscription(filePath) {
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${OPENAI_API_KEY}`);
  headers.append("Content-Type", "multipart/form-data");

  const fileStream = fs.createReadStream(filePath);
  let formData = new FormData();
  formData.append('file', fileStream);
  formData.append('model', "whisper-1");

  let transcribeResponse = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, headers);
  console.log("initiateTranscription", transcribeResponse)

  if (transcribeResponse.data.error) {
      return { error: transcribeResponse.data.error };
  }

  return await response.json();
}

// Function to retrieve complete transcript text (replace with actual cloud service API call)
async function getTranscriptText(transcriptId) {
  const url = `${cloudServiceUrl}/${transcriptId}`;
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${apiKey}`);

  const response = await fetch(url, {
    headers,
  });

  const transcriptData = await response.json();
  return transcriptData.text;
}

async function transcribeWithASsemblyAI(filePath) {
    const fileStream = fs.createReadStream(filePath);

    let formData = new FormData();
    formData.append('file', fileStream);

    if (process.env.NODE_ENV === 'dev') {
        require('dotenv').config();
    }
    const API_KEY = process.env.ASSEMBLY_AI_API_KEY;
    if (API_KEY !== '') {
        console.log("API_KEY read successfully");
    }
    let uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', formData, {
        headers: {
            ...formData.getHeaders(),
            'authorization': API_KEY
        }
    });

    if (uploadResponse.data.error) {
        return { error: uploadResponse.data.error };
    }

    const audioUrl = uploadResponse.data.upload_url;
    console.log("get transcribe - audioUrl", audioUrl)

    let transcribeResponse = await axios.post('https://api.assemblyai.com/v2/transcript', {
        audio_url: audioUrl
    }, {
        headers: {
            'authorization': API_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (transcribeResponse.data.error) {
        return { error: transcribeResponse.data.error };
    }

    let transcriptId = transcribeResponse.data.id;
    let transcriptStatus = transcribeResponse.data.status;

    console.log("get transcribe - transcriptId", transcriptId)
    console.log("get transcribe - transcriptStatus", transcriptStatus)

    while (transcriptStatus !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 5000));
        transcribeResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: {
                'authorization': API_KEY
            }
        });
        transcriptStatus = transcribeResponse.data.status;
        if (transcriptStatus === "error") {
            console.log("Transcription error occurred. Returning error status.");
            return { error: "Transcription error occurred" };
        }

        console.log("get transcribe - transcriptStatus", transcriptStatus) 
    }
    return transcribeResponse.data.text;
  };

const generateHeader = (filePath) => {
    const currentDate = new Date().toLocaleString();
    return {
        'File': filePath,
        'Date': currentDate
    };
};

app.get('/transcribe', async (req, res) => {
    console.log("get transcribe -->")
    try {
        //let transcriptionOutput = "Sample"
        const transcriptionOutput = await transcribeWithASsemblyAI(AUDIO_FILE_PATH); // await transcribeUsingWhisperAPI(AUDIO_FILE_PATH); //
        const header = generateHeader(AUDIO_FILE_PATH);
        header['Transcription'] = transcriptionOutput;
        res.json(header);
    } catch (error) {
        console.error("Error in transcribing audio:", error);
        res.status(500).json({ error: 'An error occurred while transcribing audio' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

