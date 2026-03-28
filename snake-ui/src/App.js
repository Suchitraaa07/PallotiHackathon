import React, { useState } from 'react';
import axios from 'axios';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

function App() {
  const [results, setResults] = useState([]);
  const { transcript, resetTranscript, listening } = useSpeechRecognition();

  // 1. Search by Voice
  const searchByVoice = async () => {
    const response = await axios.get(`http://localhost:8002/search?text=${transcript}`);
    setResults(response.data);
  };

  // 2. Search by Similarity (The "Similar" Button)
  const searchSimilar = async (imagePath) => {
    // Only pass the relative path (no file://, no absolute path)
    let relPath = imagePath;
    if (relPath.startsWith('file://')) {
      relPath = relPath.replace('file://', '');
    }
    // Remove any leading slashes or old absolute paths
    relPath = relPath.replace(/^.*images\//, 'images/');
    const response = await axios.get(`http://localhost:8002/search?image_path=${relPath}`);
    setResults(response.data);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
      <h1>🐍 Snake Identifier</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Microphone: {listening ? 'Listening...' : 'Off'}</p>
        <button onClick={SpeechRecognition.startListening}>Start Recording</button>
        <button onClick={() => { searchByVoice(); SpeechRecognition.stopListening(); }}>Identify Snake</button>
        <button onClick={resetTranscript}>Reset</button>
      </div>

      <p><i>"{transcript}"</i></p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        {results.map((snake, index) => (
          <div key={index} style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '10px' }}>
            <img src={`http://localhost:8002/${snake.image_path.replace(/^.*images\//, 'images/')}`} alt="snake" style={{ width: '100%', borderRadius: '5px' }} />
            <h3>{snake.species}</h3>
            <p>{snake.category}</p>
            <button onClick={() => searchSimilar(snake.image_path)}>Similar Snakes</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;