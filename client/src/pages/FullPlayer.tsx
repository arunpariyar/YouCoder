import React from 'react';
import { PlaybackEditor } from '../components/PlaybackEditor';
import TopNavBar from '../components/HomePageComponents/TopNavBar';
import YouCoderHeading from '../components/YouCoderHeading';
import Stack from '@mui/material/Stack';
import FaceIcon from '@mui/icons-material/Face';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { Chip, IconButton } from '@mui/material';
import ReplyIcon from '@mui/icons-material/Reply';
import { Recording } from '../types/Creator';
import ButtonGroup from '@mui/material';
import { MultiEditorPlayback } from '../components/MultiEditorPlayback';
import { toast } from 'react-toastify';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GitHubIcon from '@mui/icons-material/GitHub';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';

interface FullPlayerPageProps {
  recordingData: Recording;
}



interface Social {
  name: string;
  social: string;
}

const FullPlayerPage: React.FC<FullPlayerPageProps> = ({ recordingData }) => {

console.log('recordingData:--->', recordingData)


  return (
    <div className='min-h-screen bg-bg-pri min-w-[720px] px-20 flex flex-col justify-center items-center'>
      <div>
        <TopNavBar />

        <div className='bg-bg-pri relative flex justify-center items-center overflow-y-scroll overflow-x-hidden hide-scrollbar pt-4 max-w-[1600px]'>
          <div className=' bg-bg-pri border-solid mx-2 pt-4 top-[20px] mb-20 pb-0 overflow-y-scroll border border-gray-600  rounded-2xl hide-scrollbar'>
            {/* className="border border-bg-pri rounded-xl pt-2 */}
            <PlaybackEditor
              theme='dark'
              recordingData={recordingData}
            />

            <div className='w-full bg-bg-pri h-auto mt-[15px] mx-auto '>
              <div className='bg-bg-pri mx-4 pt-2 -mt-10'>
                <div className=''>
                  {/* title */}

                  <div className='text-gray-200 text-4xl text-left pb-6 mx-2 mt-2 text-ellipsis line-clamp-2'>
                    {recordingData.title}
                  </div>
                  <div className='bg-bg-pri flex flex-row border border-gray-600 rounded-lg p-3 pt-4 h-60 mb-4'>
                    
                      {/* ---------Left Card */}
                      <div className='flex flex-col items-center mx-1 min-w-36 max-w-[20vw] '>
                        <div className='h-36 w-36 md:h-44 md:w-44 rounded-xl shadow bg-bg-pri flex items-center justify-center md:-mt-4'>
                          <div className='flex flex-col items-center'>
                            <img
                              className='w-20 h-20 !min-w-20 mb-3 rounded-full shadow-lg'
                              src={recordingData.creator!.picture}
                              alt=''
                            />
                            <h5 className=' text-sm md:text-lg  font-medium text-white text-ellipsis line-clamp-2'>
                              {recordingData.creator?.display_name}
                            </h5>
                          </div>
                        </div>



                        {/* <Button
                          variant='contained'
                          size='small'
                          onClick={(e) => {
                            navigator.clipboard.writeText(
                              recordingData.full_link
                            );
                            toast.success('Link copied to clipboard');
                          }}
                          className='!rounded-full !bg-bg-muigrey !border-gray-700 w-36 md:w-44 !text-gray-100 whitespace-nowrap h-8 align-middle active:ring-1 active:ring-bg-alt hover:!bg-gray-700'
                        >
                           <ContentCopyIcon className='scale-75'/> 
                          copy link
                        </Button> */}

{ }

<div className='flex justify-center space-x-3 lg:space-x-4 scale-150 mt-2'>
  {recordingData.creator.socials.length > 0 && recordingData.creator.socials.some((social: Social) => social.name === 'github') ? (
    <a href={recordingData.creator.socials.find((social: Social) => social.name === 'github').social}>
    <IconButton aria-label="GitHub"><GitHubIcon className='!fill-white' /></IconButton>
  </a>
  ) : (
    <GitHubIcon className='!fill-bg-gptdark'/>
  )}

  {recordingData.creator.socials.length > 0 && recordingData.creator.socials.some((social: Social) => social.name === 'youtube') ? (
    <a href={recordingData.creator.socials.find((social: Social) => social.name === 'youtube').social}>
    <IconButton aria-label="YouTube"><YouTubeIcon className='!fill-white'/></IconButton>
  </a>
  ) : (
    <YouTubeIcon className='!fill-bg-gptdark'/>
  )}

  {recordingData.creator.socials.length > 0 && recordingData.creator.socials.some((social: Social) => social.name === 'twitter') ? (
    <a href={recordingData.creator.socials.find((social: Social) => social.name === 'twitter').social}>
    <IconButton aria-label="Twitter"><TwitterIcon className='!fill-white'/></IconButton>
  </a>
  ) : (
    <TwitterIcon className='!fill-bg-gptdark'/>
  )}
</div>



                      </div>

                      {/* Middle Card -----------------------------------   */}

                      <div className='flex-col mx-1 min-w-[60vw] max-w-[1000px] w-full py-4 ml-4 h-52 text-left  border-l  shadow bg-bg-pri border-gray-600 overflow-hidden text-white'>
  <div className='px-5 pt-1 md:h-full max-w-[60vw] overflow-y-auto scrollbar-hide overflow-x-hidden' style={{wordWrap: 'break-word', whiteSpace: 'pre-wrap'}}>
    <p>{recordingData.description}</p>
  </div>
</div>

 {/* end of card-----------------------------------------------*/}

                     

                      
                    
                  </div>
                  
                 
                </div>

                <div className='flex md:flex-row'></div>

                <div className='ml-6 bg-bg-pri '>
                  <div className='flex flex-col w-full'>
                    <div className='flex justify-between items-start'>
                      <div className='flex flex-col'></div>
                    </div>
                  </div>

                  <div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullPlayerPage;
