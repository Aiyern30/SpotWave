import React from 'react'
import { usePathname } from 'next/navigation';
import { Input } from './ui';

const Header = () => {
    const router = usePathname().split("/");

  return (
    <div className='flex flex-col space-y-3'>
                                <div className='header'>{router}</div>
                                <div><Input type='text' placeholder='What do you want to play?'></Input></div>
                            </div>
  )
}

export default Header
