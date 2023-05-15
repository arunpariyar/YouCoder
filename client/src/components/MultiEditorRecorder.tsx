import Editor from '@monaco-editor/react';
import React, { useState, useRef, useEffect } from 'react';
import { editor } from 'monaco-editor';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

import { SaveRecordingModal } from './HomePageComponents/SaveRecordingModal';
import { saveYCRFile } from '../utils/ycrUtils';
import { useAppSelector } from '../redux/hooks';
import recordingApi from '../services/recordingApi';
import { formatTime, calculateTotalPauseTime } from '../utils/editorUtils';

import {
  RecorderActions,
  EditorAction,
  EditorRecording,
  htmlOutput,
} from '../types/MultiEditor';
import { RecorderEditor } from './RecorderEditor';

export function MultiEditorRecorder() {
  //Multi states
  const [htmlEditorInstance, setHtmlEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);
  const [cssEditorInstance, setCssEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);
  const [jsEditorInstance, setJsEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);
  const [htmlOutput, setHtmlOutput] = useState<string>('');

  const [fontSize, setFontSize] = useState(14);

  const [recorderState, setRecorderState] = useState<
    'stopped' | 'recording' | 'paused'
  >('stopped');
  const [recorderLoading, setRecorderLoading] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState('multi');

  const [consoleOutput, setConsoleOutput] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [recordingIntervalId, setRecordingIntervalId] =
    useState<NodeJS.Timeout | null>(null);
  const [pauseAction, setPauseAction] = useState(false);

  const recorderActions = useRef<RecorderActions>({
    start: 0,
    end: 0,
    pauseArray: [],
    resumeArray: [],
    pauseLengthArray: [],
    editorActions: [],
    consoleLogOutputs: [],
    htmlOutputArray: [],
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioRecordingBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });

        mediaRecorderRef.current.ondataavailable = function (e) {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }

          if (mediaRecorderRef.current!.state === 'inactive') {
            // Check if the recorder is stopped
            audioRecordingBlobRef.current = new Blob(
              recordedChunksRef.current,
              {
                type: 'audio/webm',
              }
            );
            recordedChunksRef.current = [];
          }
        };
      })
      .catch((error) => {
        console.error('Could not get user media', error);
        // Display message to user
        alert(
          'Permission for microphone is required to record. Please enable access and refresh the page.'
        );
      });
  }, []);

  useEffect(() => {
    return () => {
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
      }
    };
  }, [recordingIntervalId]);

  useEffect(() => {
    const defaultFontSize = getDefaultFontSize();
    setFontSize(defaultFontSize);

    // Listen to resize event
    const handleResize = () => {
      const newDefaultFontSize = getDefaultFontSize();
      if (newDefaultFontSize !== defaultFontSize) {
        setFontSize(newDefaultFontSize);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (htmlEditorInstance && cssEditorInstance && jsEditorInstance) {
      htmlEditorInstance!.updateOptions({ fontSize });
      cssEditorInstance!.updateOptions({ fontSize });
      jsEditorInstance!.updateOptions({ fontSize });
    }
  }, [fontSize]);

  function handleLanguageChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedLanguage(event.target.value);
  }

  const getDefaultFontSize = () => {
    let div = document.createElement('div');
    div.style.fontSize = 'initial';
    div = document.body.appendChild(div);
    const defaultFontSize = parseFloat(
      window.getComputedStyle(div, null).fontSize
    );
    document.body.removeChild(div);
    return defaultFontSize;
  };

  const user = useAppSelector((state) => state.user);

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor'),
    fileType: 'html' | 'css' | 'javascript'
  ) {
    switch (fileType) {
      case 'html':
        setHtmlEditorInstance(editor);
        break;
      case 'css':
        setCssEditorInstance(editor);
        break;
      case 'javascript':
        setJsEditorInstance(editor);
        break;
    }
  }

  function handleEditorChange(
    value?: string,
    event?: editor.IModelContentChangedEvent,
    fileType?: 'html' | 'css' | 'javascript'
  ) {
    const actionCreationTimestamp = Date.now();
    event!.changes.forEach((change: editor.IModelContentChange) => {
      const range = change.range;
      const text = change.text;
      recorderActions.current.editorActions.push({
        ...range,
        actionCreationTimestamp,
        playbackTimestamp: 0,
        text,
        fileType,
      });
    });
    if (recorderState === 'paused') {
      setPauseAction(true);
    }
  }

  function handleRenderOutput() {
    const html = htmlEditorInstance?.getValue() ?? '<h1>hello</h1>';
    const css = cssEditorInstance?.getValue() ?? '';
    const js = jsEditorInstance?.getValue() ?? '';
    const output = `<html>
    <head>
      <style>${css}</style>
    </head>
    <body>
      ${html}
      <script>${js}</script>
    </body>
  </html>`;

    recorderActions.current.htmlOutputArray.push({
      output: output,
      timestamp: Date.now(),
      playbackTimestamp: 0,
    });
    setHtmlOutput(output);
  }

  //recording handlers
  function handleStartRecording() {
    if (!mediaRecorderRef.current) {
      alert(
        'Permission for microphone is required to record. Please enable access and refresh the page.'
      );
      return;
    }
    //audio
    setRecorderLoading(true);
    mediaRecorderRef.current!.start();
    setRecorderLoading(false);
    //actions
    recorderActions.current.editorActions = [];
    recorderActions.current.htmlOutputArray = [];
    recorderActions.current.pauseArray = [];
    recorderActions.current.pauseLengthArray = [];
    recorderActions.current.resumeArray = [];

    htmlEditorInstance!.setValue('');
    cssEditorInstance!.setValue('');
    jsEditorInstance!.setValue('');
    setHtmlOutput('');
    recorderActions.current.start = Date.now();
    setRecorderState('recording');
    setConsoleOutput('');

    //timer
    setElapsedTime(0);
    const intervalId = setInterval(() => {
      setElapsedTime((prevTime) => prevTime + 1000);
    }, 1000);
    setRecordingIntervalId(intervalId);
  }

  function handlePauseRecording() {
    mediaRecorderRef.current!.requestData();
    mediaRecorderRef.current!.pause();
    let timestamp = Date.now();
    recorderActions.current.pauseArray.push({ timestamp });
    setRecorderState('paused');
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setPauseAction(false);
  }
  function handleResumeRecording() {
    mediaRecorderRef.current!.resume();
    let timestamp = Date.now();
    recorderActions.current.resumeArray.push({ timestamp });
    setRecorderState('recording');
    const intervalId = setInterval(() => {
      setElapsedTime((prevTime) => prevTime + 1000);
    }, 1000);
    setRecordingIntervalId(intervalId);
    setPauseAction(false);
  }
  function handleEndRecording() {
    console.log(recorderActions);
    if (pauseAction) {
      if (
        !window.confirm(
          'You have unsaved changes from when the recording was paused. These changes will be discarded. Are you sure you want to end the recording?'
        )
      ) {
        //If they press cancel on the prompt, don't run the rest of the handleEndRecording Function
        return;
      }
    }
    const timestamp = Date.now();
    recorderActions.current.end = timestamp;

    // Filter out actions that occurred during the last pause period (if any)
    if (
      recorderActions.current.pauseArray.length >
      recorderActions.current.resumeArray.length
    ) {
      const lastPauseTimestamp =
        recorderActions.current.pauseArray[
          recorderActions.current.pauseArray.length - 1
        ].timestamp;

      recorderActions.current.editorActions =
        recorderActions.current.editorActions.filter((action: EditorAction) => {
          return action.actionCreationTimestamp < lastPauseTimestamp;
        });

      recorderActions.current.htmlOutputArray =
        recorderActions.current.htmlOutputArray.filter((change: htmlOutput) => {
          return change.timestamp < lastPauseTimestamp;
        });
    }

    // Calculate playbackTimestamp for each editor action
    recorderActions.current.editorActions =
      recorderActions.current.editorActions.map((action: EditorAction) => {
        let totalPauseTime = calculateTotalPauseTime(
          action.actionCreationTimestamp,
          timestamp,
          recorderActions.current
        );

        const adjustedTimestamp =
          action.actionCreationTimestamp -
          recorderActions.current.start -
          totalPauseTime;
        return { ...action, playbackTimestamp: adjustedTimestamp };
      });

    // Calculate playbackTimestamp for each console log change
    recorderActions.current.htmlOutputArray =
      recorderActions.current.htmlOutputArray.map((change) => {
        let totalPauseTime = calculateTotalPauseTime(
          change.timestamp,
          timestamp,
          recorderActions.current
        );

        const adjustedTimestamp =
          change.timestamp - recorderActions.current.start - totalPauseTime;
        return { ...change, playbackTimestamp: adjustedTimestamp };
      });

    console.log(recorderState);
    if (recorderState === 'paused') {
      mediaRecorderRef.current!.resume(); // Resume recording
      mediaRecorderRef.current!.onresume = () => {
        setTimeout(() => {
          mediaRecorderRef.current!.stop();
        }, 1000);
      };
    } else {
      mediaRecorderRef.current!.stop();
    }
    setRecorderState('stopped');
    if (recordingIntervalId) {
      clearInterval(recordingIntervalId);
      setRecordingIntervalId(null);
    }
    setSaveModalVisible(true);
  }

  async function handleSave(
    title: string,
    description: string,
    thumbnail_link: string
  ) {
    try {
      const json = JSON.stringify(recorderActions.current);
      const jsonBlob = new Blob([json], { type: 'application/json' });

      const ycrFileUrl = await saveYCRFile(
        jsonBlob,
        audioRecordingBlobRef.current!,
        user.uid!
      );
      console.log(ycrFileUrl);
      const language = 'multi';

      const Recording: EditorRecording = {
        title,
        description,
        thumbnail_link,
        language,
        recording_link: ycrFileUrl,
        duration: elapsedTime,
      };

      recordingApi.postRecording(Recording);
    } catch (error) {
      console.error('Error saving recording', error);
    }
  }

  function handleDiscard() {}

  return selectedLanguage !== 'multi' ? (
    <RecorderEditor />
  ) : (
    <>
      {recorderState === 'stopped' && (
        <>
          <div className='flex items-center mx-[15vw]'>
            <label
              className='block mb-2 text-sm font-medium text-white mr-3'
              htmlFor='language'
            >
              Choose a language to record in:
            </label>
            <select
              id='language'
              onChange={handleLanguageChange}
              className='border text-sm rounded-lg  block w-48 px-2.5 py-1 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-bg-sec focus:border-bg-sec mb-3'
            >
              <option defaultValue='multi'>HTML, CSS & JavaScript</option>
              <option value='javascript'>JavaScript</option>
              <option value='typescript'>TypeScript</option>
              <option value='python'>Python</option>
              <option value='java'>Java</option>
              <option value='csharp'>C#</option>
              <option value='cpp'>C++</option>
              <option value='ruby'>Ruby</option>
              <option value='go'>Go</option>
            </select>
          </div>
        </>
      )}
      {recorderState !== 'stopped' && (
        <div className='border text-sm rounded-lg w-48 bg-gray-700 border-gray-600 text-white focus:ring-bg-sec focus:border-bg-sec mb-3 flex items-center justify-center mx-[15vw]'>
          {selectedLanguage}
        </div>
      )}
      <div className='flex w-full h-[500px] border border-white rounded-sm'>
        <Allotment>
          <Allotment.Pane minSize={500}>
            <Editor
              height='500px'
              defaultLanguage='html'
              defaultValue=''
              theme='vs-dark'
              options={{
                wordWrap: 'on',
                fontSize: fontSize,
              }}
              onChange={(value, event) =>
                handleEditorChange(value, event, 'html')
              }
              onMount={(editor, monaco) =>
                handleEditorDidMount(editor, monaco, 'html')
              }
            />
          </Allotment.Pane>
        </Allotment>
        <Allotment>
          <Allotment.Pane minSize={500}>
            <Editor
              height='500px'
              defaultLanguage='css'
              defaultValue=''
              theme='vs-dark'
              options={{
                wordWrap: 'on',
                fontSize: fontSize,
              }}
              onChange={(value, event) =>
                handleEditorChange(value, event, 'css')
              }
              onMount={(editor, monaco) =>
                handleEditorDidMount(editor, monaco, 'css')
              }
            />
          </Allotment.Pane>
        </Allotment>
        <Allotment>
          <Allotment.Pane minSize={500}>
            <Editor
              height='500px'
              defaultLanguage='javascript'
              defaultValue=''
              theme='vs-dark'
              options={{
                wordWrap: 'on',
                fontSize: fontSize,
              }}
              onChange={(value, event) =>
                handleEditorChange(value, event, 'javascript')
              }
              onMount={(editor, monaco) =>
                handleEditorDidMount(editor, monaco, 'javascript')
              }
            />
          </Allotment.Pane>
        </Allotment>
      </div>

      {recorderState === 'stopped' && (
        <button className='p-2 text-white' onClick={handleStartRecording}>
          Start Recording
        </button>
      )}

      {recorderState === 'recording' && (
        <>
          <button className='p-2 text-white' onClick={handlePauseRecording}>
            Pause Recording
          </button>
          <button className='p-2 text-white' onClick={handleEndRecording}>
            End Recording
          </button>
        </>
      )}

      {recorderState === 'paused' && (
        <>
          <button className='p-2 text-white' onClick={handleResumeRecording}>
            Resume Recording
          </button>
          <button className='p-2 text-white' onClick={handleEndRecording}>
            End Recording
          </button>
        </>
      )}

      <button className='p-2 text-white' onClick={handleRenderOutput}>
        Render HTML
      </button>

      {recorderLoading && (
        <div className='p-2'>
          <span>Loading...</span>
        </div>
      )}

      {recorderState !== 'stopped' && (
        <p className='p-2 text-white'>
          {formatTime(elapsedTime)}
          {recorderState === 'recording' && (
            <span className='text-red-700 animate-[blinking_1s_infinite] text-4xl'>
              •
            </span>
          )}
        </p>
      )}

      {saveModalVisible && (
        <SaveRecordingModal
          onSave={handleSave}
          onDiscard={handleDiscard}
          onClose={() => setSaveModalVisible(false)}
        />
      )}

      <iframe
        srcDoc={htmlOutput}
        title='Output'
        sandbox='allow-scripts'
      ></iframe>
    </>
  );
}
