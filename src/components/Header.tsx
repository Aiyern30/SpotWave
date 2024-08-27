import React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage, Input } from './ui';

const Header = () => {
  const router = usePathname().split("/").filter(Boolean);
  const searchParams = useSearchParams();
  const name = searchParams.get("name");

  return (
    <div className='flex flex-col space-y-3 '>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink  href="/Home">Home</BreadcrumbLink>
          </BreadcrumbItem>
          {router.map((segment, index) => {
            // Skip "Home" if it appears as a segment in the route
            if (segment.toLowerCase() === "home" && index === 0) return null;

            const isLast = index === router.length - 1;
            const href = `/${router.slice(0, index + 1).join("/")}`;

            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator className='text-white'/>
                <BreadcrumbItem className='text-white'>
                  {isLast && name ? (
                    <BreadcrumbPage className='text-white'>{name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href} >
                      {segment.charAt(0).toUpperCase() + segment.slice(1)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <Input type='text' placeholder='What do you want to play?' />
      </div>
    </div>
  );
};

export default Header;
