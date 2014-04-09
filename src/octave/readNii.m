% A=readNii(fname)
% input: 
%   fname: can point to a .nii file or directory containing a series of .nii files
% output:
%   A.image
%   A.transformation (4x4 affine transformation)
function A=readNii(fname)
if (isdir(fname))
	list=dir(strcat(fname,'/*.nii'));
	if (length(list)>0)
		tmp=readNii(strcat(fname,'/',list(1).name));
		A.transformation=tmp.transformation;
		A.image=zeros(size(tmp.image,1),size(tmp.image,2),size(tmp.image,3),length(list));
		for j=1:length(list)
			tmp2=readNii(strcat(fname,'/',list(j).name));
			A.image(:,:,:,j)=tmp2.image;
		end;
	else
		error(strcat('No .nii files found in directory: ',fname));
		A=[];
	end;
else
	tmp=load_untouch_nii(fname);
	A=struct();
	A.image=tmp.img;
	A.transformation=get_transformation_from_nii_header(tmp.hdr);
	A.voxel_size=get_voxel_size_from_transformation(A.transformation);
end;
end

function transformation=get_transformation_from_nii_header(hdr)
transformation=eye(4,4);
transformation(1,:)=hdr.hist.srow_x;
transformation(2,:)=hdr.hist.srow_y;
transformation(3,:)=hdr.hist.srow_z;
if (det(transformation)==0)
	dx=hdr.dime.pixdim(2);
	dy=hdr.dime.pixdim(3);
	dz=hdr.dime.pixdim(4);
	transformation=diag([dx,dy,dz,1]);
end;
end

function voxel_size=get_voxel_size_from_transformation(transformation) 
p0=[0;0;0;1];
p1=[1;0;0;1];
p2=[0;1;0;1];
p3=[0;0;1;1];
q0=transformation*p0;
q1=transformation*p1;
q2=transformation*p2;
q3=transformation*p3;
voxel_size=[sqrt((q1-q0)'*(q1-q0)),sqrt((q2-q0)'*(q2-q0)),sqrt((q3-q0)'*(q3-q0))];
end
