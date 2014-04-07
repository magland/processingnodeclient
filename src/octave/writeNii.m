function writeNii(fname,A)

voxel_size=get_voxel_size_from_transformation(A.transformation);
origin=[0,0,0];
datatype=determine_datatype_from_nii_image(A.image);
X=make_nii(A.image,voxel_size,origin,datatype,[]);
X.hdr.hist.sform_code=1;
X.hdr.hist.srow_x=A.transformation(1,:);
X.hdr.hist.srow_y=A.transformation(2,:);
X.hdr.hist.srow_z=A.transformation(3,:);
X.img=A.image;
save_nii(X,fname);

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

function datatype=determine_datatype_from_nii_image(img) 
V0=img(:);
min0=min(V0);
max0=max(V0);
positive=(min0>=0);
integer=(max(abs(V0-floor(V0)))==0);
if (positive)&&(integer)
	if (max0<2^8)
		datatype=2; %uint8
	elseif (max0<2^16)
		datatype=512; %uint16
	else
		datatype=768; %uint32
	end;
elseif (~positive)&&(integer)
	if (max0<2^7)
		datatype=256; %int8
	elseif (max0<2^15)
		datatype=4; %int16
	else
		datatype=8; %int32
	end
elseif (~integer)
	datatype=16; %float32
end;
	
end

